# Spec — Attendance module (1/4): data, API and per-shop module switch

Issue: #907 · Status: approved mockup 2026-10-12 · Intent: ./intent.md · Product: #906
Mockup (approved): ./mockup.html (copy of https://claude.ai/artifact/MikH31P6eVqyzbnj6BoWzf)

All ids on the wire are the numeric `id` the API already exposes for users / outlets / merchants.
"Day" = Vietnam civil day key `YYYY-MM-DD` (`SHOP_TIMEZONE`). Times are UTC instants from the server clock.
Weekday numbers: 1 = Monday … 7 = Sunday (VN day).

## Behavior

### Module switch

1. A merchant has module `attendance` active when a `MerchantModule` row (merchantId, key `attendance`)
   has `enabled = true` and (`endsAt` is null or `endsAt` > now). Otherwise it is off.
2. The module catalog lives in `@rentalshop/constants` (`MODULES`): `attendance` (requires nothing).
   A later `payroll` entry declares `requires: ['attendance']`; a module whose requirement is off is off.
3. Every `/api/attendance/**` route answers 403 `MODULE_NOT_ENABLED` when the caller's merchant (or the
   kiosk token's outlet merchant) does not have `attendance` active. The check runs after auth, before
   anything else. Turning the module off keeps every row.
4. `GET /api/merchants/[id]/modules` (ADMIN, OPS) lists the catalog with `{ key, enabled, endDate, active }`.
   `PUT /api/merchants/[id]/modules/[key]` (ADMIN only) body `{ enabled: boolean, endDate?: 'YYYY-MM-DD' | null }`;
   `endDate` is inclusive (stored as the end of that VN day). Each change writes an `AuditLog` row.
5. The login response (shared `build-auth-login-response`) and `GET /api/users/profile` add
   `merchant.modules: string[]` (active keys). No other field changes. `app-config` is unchanged (public, cached).
6. Admin merchant detail page shows a "Module" card: Chấm công · status · end date · Sửa (dialog: Bật/Tắt +
   optional end date). Tính lương row shows "Chưa có" (disabled).

### Outlet attendance settings and QR (mockup: Cài đặt → Chi nhánh → Mở ›)

Each outlet has its own location, radius and QR code. Outlet name, address and phone are read-only here.

7. `GET /api/attendance/settings?outletId=` → `{ outletId, latitude, longitude, radiusM, qrMode,
   qr: { generated, code, validDate, createdAt }, kioskToken }`. Missing row = `radiusM: 100,
   qrMode: 'DAILY', generated: false`. Without `outletId` it lists all outlets in scope with
   `{ outletId, configured, qrMode, generated }` (outlet list badge "Có mã QR · đổi mỗi ngày / cố định" /
   "Chưa tạo mã").
8. `PUT /api/attendance/settings` `{ outletId, latitude?, longitude?, radiusM?, qrMode? }`: coordinates and
   radius MERCHANT only; `qrMode` (`DAILY` | `FIXED`) MERCHANT and OUTLET_ADMIN of that outlet.
   `radiusM` integer 50–500; lat ∈ [-90, 90], lng ∈ [-180, 180]. Changing `qrMode` changes the code.
9. `POST /api/attendance/settings/qr` `{ outletId }` (MERCHANT, OUTLET_ADMIN of that outlet): "Tạo mã QR"
   the first time, "Tạo mã mới" after. Increments `qrVersion`; every older code stops working at once.
10. QR code string: `a1.<outletId>.<qrVersion>.<D|F>.<dateKey|0>.<hmac>`; HMAC-SHA256 truncated to 16 bytes,
    base64url, key `HMAC(JWT_SECRET, 'attendance-qr-v1')` (no new env var). The code is computed, never stored.
    - `DAILY`: `dateKey` = today's VN day; valid only while the server's VN day equals it (changes at 00:00).
    - `FIXED`: `dateKey` = `0`; valid until a new code is made or the mode changes.
11. `POST /api/attendance/settings/kiosk-link` `{ outletId }` (MERCHANT, OUTLET_ADMIN of that outlet)
    creates or replaces the kiosk token (32 random bytes, base64url, stored so the link can be copied again).
    The old link stops working at once.
12. `GET /api/attendance/kiosk/qr` with header `X-Kiosk-Token` (only public attendance route) →
    `{ outlet: { id, name }, code, qrMode, validDate, refreshAfterSec: 60, recent: [{ name, action, at }] }`
    (last 5 punches today at that outlet, first name only). Unknown token → 401 `UNAUTHORIZED`;
    module off → 403 `MODULE_NOT_ENABLED`; no coordinates or no QR yet → 422 `ATTENDANCE_NOT_CONFIGURED`.

### Punch

13. `POST /api/attendance/punch` (MERCHANT and every outlet role) body
    `{ code, latitude, longitude, accuracy, isMock }`. Checks, in order; the first failure answers:
    1. module off → 403 `MODULE_NOT_ENABLED`
    2. `isMock === true` → 422 `MOCK_LOCATION`
    3. code malformed, bad signature, old `qrVersion`, mode mismatch or another VN day → 422 `QR_EXPIRED`
    4. QR outlet ≠ the user's outlet (MERCHANT: outlet not in its merchant) → 422 `QR_WRONG_OUTLET`
    5. outlet has no coordinates → 422 `ATTENDANCE_NOT_CONFIGURED`
    6. `accuracy` > 100 m → 422 `GPS_INACCURATE` with `data: { accuracyM }`
    7. haversine distance > `radiusM` → 422 `OUT_OF_RANGE` with `data: { distanceM, radiusM }`
14. Every scan that reaches checks 2–7 writes an `AttendanceScan` row: user, outlet (if known), server time,
    lat, lng, accuracy, distance, result (`ACCEPTED` or the error code), action. It feeds the per-person
    detail table (rejected scans and coordinates included).
15. If the user has an open record (after the lazy auto-close of rule 18) the punch closes it (`OUT`),
    otherwise it opens a new record (`IN`). OUT without IN is impossible. Two punches of the same user are
    serialized (row lock on the user in one transaction). Several IN/OUT pairs per day are allowed.
16. Suspected fake (stored, never blocks): accuracy exactly 0; lat and lng identical to the user's
    previous accepted scan; or speed from the previous accepted scan > 50 m/s when the distance exceeds
    both accuracies summed. Reasons stored (`ZERO_ACCURACY`, `SAME_COORDS`, `SPEED`).
17. Response `{ action, record, distanceM, accuracyM, lateMinutes, earlyMinutes, overtimeMinutes, shift }`.
    On IN the record links to the user's effective shift (rule 21) whose window `[start − 3 h, end]` contains
    the instant; a cross-midnight shift of the previous day counts. The record copies the shift's name,
    start, end and break (snapshot), so later template edits never change worked days. `dateKey` = the
    shift's day, or the VN day of the IN instant when there is no shift.

### Forgot to clock out

18. An open record becomes `MISSING_OUT` once now passes its close time: end of its VN `dateKey`, or
    shift end + 4 h for a cross-midnight shift. `checkOutAt` stays null, hours = 0, `autoClosedAt` set.
    Applied lazily on punch and on every read (one `updateMany`). No cron.

### Shift templates

19. `GET/POST /api/attendance/shift-templates`, `PUT/PATCH/DELETE /api/attendance/shift-templates/[id]`
    with `{ outletId, name, startTime 'HH:mm', endTime 'HH:mm', breakMinutes 0–600,
    color: 'blue'|'purple'|'green'|'orange' }`. `endTime <= startTime` = cross-midnight (counted on the
    start day). `used` = referenced by any rule, day change or record.
    - PUT applies to days not yet worked (records keep their snapshot).
    - PATCH `{ isActive: false }` hides it (cannot be picked; existing rules keep running); `true` shows it.
    - DELETE only when `used` is false, else 409 `SHIFT_TEMPLATE_IN_USE`.

### Weekly schedule: rules + one-day changes

20. Rules ("gán một lần, lặp hằng tuần"): `GET /api/attendance/shift-rules?outletId`,
    `POST /api/attendance/shift-rules` `{ outletId, templateId, userIds: number[], weekdays: number[],
    startDate, endDate? }` (one rule row per user), `PUT /api/attendance/shift-rules/[id]` `{ templateId?,
    weekdays?, effectiveFrom }`, `POST /api/attendance/shift-rules/[id]/stop` `{ lastDate }`,
    `DELETE /api/attendance/shift-rules/[id]`.
    - PUT = end the old rule the day before `effectiveFrom` and create a new rule from it (history kept).
    - DELETE = set `endDate` to yesterday (or remove the row when `startDate` is in the future).
    - `startDate`, `effectiveFrom`, `lastDate` must be ≥ today (VN), else 409 `SHIFT_LOCKED`.
    - Overlapping times with another rule of the same user on the same weekday (from the later start date)
      → 409 `SHIFT_OVERLAP`.
21. One-day changes: `PUT /api/attendance/shifts/day` `{ outletId, userId, date, templateId? | custom:
    { startTime, endTime, breakMinutes }? | off: true }` replaces that user's shifts on that day only
    ("Đổi ca", "Giờ riêng", "Xoá ca ngày này"). `DELETE /api/attendance/shifts/day?outletId&userId&date`
    drops the change and returns to the rules.
    Effective schedule of a user on a day = the one-day change if any, else every rule active that day
    whose weekdays include it.
22. Lock: a day is locked when `date` < today (VN), or the user already has a record linked to that shift.
    A change touching a locked day → 409 `SHIFT_LOCKED`. Rule changes only affect unlocked days.
23. `GET /api/attendance/shifts?outletId&from&to` (max 62 days) returns the effective schedule per user
    per day `{ userId, date, shifts: [{ templateId?, name, start, end, color, source: 'RULE'|'DAY', locked }] }`.
    Users must belong to that outlet (else 404).
24. After a create / change / stop / delete that changes a user's future days, the API creates a
    `Notification` (`type: 'SHIFT_CHANGED'`, data `{ outletId, dates }`) and a push through the existing
    `push-notifications.ts` for that user. Title "Lịch ca thay đổi", body like
    "T5 15/10: Ca chiều 13:00–17:30 → Ca sáng 08:00–12:00". (Old-app check: plan step 9.)
25. Late / early / overtime minutes (vs. the record's shift snapshot) are display only; overtime counts as
    normal hours.

### Timesheet, person detail, edits, month lock

26. `GET /api/attendance/timesheet?outletId&month=YYYY-MM` → per user (active users of the outlet plus
    anyone with records there that month), per day `{ hours, dayCredit, flags: { late, early, overtime,
    missingOut, suspected } }`, user totals (hours, dayCredits), summary `{ totalHours, pairs, missingOut,
    suspected }` and `locked`.
27. Record hours = (OUT − IN) − break of its shift snapshot (floor 0), 2 decimals. `MISSING_OUT`/`OPEN` = 0.
    `dayCredit` = 1 when the day has ≥ 1 `DONE` record.
28. `GET /api/attendance/people/[userId]/month?outletId&month` → summary (days, hours, late/early count,
    overtime count, missing out, suspected) and rows in time order mixing scans (rule 14), auto-closes and
    edits: `{ at, kind: 'IN'|'OUT'|'EDIT', result: 'ACCEPTED'|'REJECTED'|'AUTO_CLOSED'|'EDITED',
    errorCode?, distanceM?, accuracyM?, latitude?, longitude?, shift?, lateMinutes?, earlyMinutes?,
    overtimeMinutes?, suspectReasons?, note?, recordId? }`. Staff may call it for themselves only
    ("Ca và công của tôi").
29. `PATCH /api/attendance/records/[id]` `{ checkInAt?, checkOutAt?, reason }` and
    `POST /api/attendance/records` `{ outletId, userId, checkInAt, checkOutAt, reason }` ("+ Thêm lượt").
    ISO 8601 with offset; `reason` 1–500 chars; `checkOutAt` > `checkInAt`, ≤ 24 h later; status `DONE`.
    Each change writes `AttendanceEdit` (before, after, reason, editor). Locked month → 409 `MONTH_LOCKED`.
30. `POST /api/attendance/months/lock` and `/unlock` `{ outletId, month }` (MERCHANT only; both write an
    AuditLog).
31. `GET /api/attendance/timesheet/export?outletId&month&parts=grid,scans,edits` → `.xlsx`
    (`createExcelWorkbook`): "Bảng tháng" (hours per day, total hours, days), "Chi tiết" (every scan with
    result, distance, coordinates), "Lịch sử sửa".
32. `GET /api/attendance/me` (any role with the module) → `{ enabled, openRecord, today: { shifts, status },
    lastAction }` for the app's Settings row and the one button.

### Roles (API, `userScope`)

33. MERCHANT: everything for every outlet. OUTLET_ADMIN, own outlet: templates, rules, day changes,
    records and edits (not their own records — Q-D), QR / kiosk link, `qrMode`, timesheet, export; not
    coordinates / radius, not month lock. OUTLET_STAFF / OUTLET_INVENTORY: punch, `me`, own shifts and own
    month detail only (other `userId` / outlet → 403). ADMIN / OPS: only the module routes (OPS read).
    Another merchant's outlet, user, template, rule or record → 404.

### Errors

34. New codes with entries in `locales/{en,vi,ja,ko,zh}/errors.json`: `MODULE_NOT_ENABLED`, `QR_EXPIRED`,
    `QR_WRONG_OUTLET`, `OUT_OF_RANGE`, `GPS_INACCURATE`, `MOCK_LOCATION`, `ATTENDANCE_NOT_CONFIGURED`,
    `SHIFT_OVERLAP`, `SHIFT_LOCKED`, `SHIFT_TEMPLATE_IN_USE`, `MONTH_LOCKED`.

## Out of scope

Payroll, pricing the module, the shop web screens (#908), iOS (#909), Android (#910), geocoding an address to
coordinates (web part decides), offline punch, device binding, staff in several outlets, holidays, half
days, rounding, shift swap requests.

## API and data

New tables (additive migration):

- `MerchantModule` — merchantId, key, enabled, endsAt?, updatedById?, timestamps; unique (merchantId, key).
- `AttendanceSetting` — outletId (unique), merchantId, latitude?, longitude?, radiusM (100), qrMode
  (`DAILY`), qrVersion (0 = not generated), qrCreatedAt?, kioskToken? (unique), kioskTokenAt?.
- `ShiftTemplate` — merchantId, outletId, name, startTime, endTime, breakMinutes, color, isActive.
- `ShiftRule` — merchantId, outletId, userId, templateId, weekdays Int[], startDate, endDate?, createdById.
- `ShiftDay` — merchantId, outletId, userId, dateKey, off, templateId?, startTime?, endTime?,
  breakMinutes?, createdById; unique (userId, dateKey).
- `AttendanceRecord` — merchantId, outletId, userId, dateKey, shift snapshot (name, start, end, break)?,
  checkInAt, checkOutAt?, status (`OPEN`/`DONE`/`MISSING_OUT`), in/out lat, lng, accuracy, distanceM,
  suspectedFake, suspectReasons?, source (`PUNCH`/`MANUAL`), autoClosedAt?; index (userId, status),
  (outletId, dateKey).
- `AttendanceScan` — merchantId, outletId?, userId, at, action?, result, latitude, longitude, accuracy,
  distanceM?, recordId?; index (userId, at), (outletId, at).
- `AttendanceEdit` — recordId, editedById, before Json?, after Json, reason, createdAt.
- `AttendanceMonthLock` — outletId, month, lockedById, lockedAt; unique (outletId, month).

Existing responses: only `merchant.modules` is added (login, profile). `SHIFT_CHANGED` notifications go
only to users of a merchant with the module on.

## Open questions (defaults used unless the owner says otherwise)

- Q-B: kiosk token stored as-is so the link can be copied again — default **yes**.
- Q-D: an OUTLET_ADMIN may not edit their own records — default **no own edits** (the owner does it).
- Q-G: "Vắng" (a scheduled shift with no IN) — default: drawn by the web from `/shifts` + timesheet; no
  separate API state.

## Acceptance

- [ ] Each behavior line has a test in `plan.md` (unit, route, or business e2e)
- [ ] Old iOS / Android on `release-2026-10-12.2`: login / profile decode with `merchant.modules`;
      a `SHIFT_CHANGED` notification in the list does not crash or open a wrong order
- [ ] 11 error codes in all five locales
- [ ] VN civil days at the 16:59:59Z / 17:00:00Z boundary (daily QR, lock, auto-close, rules);
      tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
