# Spec — Attendance module (1/4): data, API and per-shop module switch

Issue: #907 · Status: draft · Intent: ./intent.md · Product spec: #906 (https://claude.ai/artifact/PTiKbG4jQDv3o29fgqSDzx)

All ids on the wire are the numeric `id` the API already exposes for users / outlets / merchants.
"Day" = Vietnam civil day key `YYYY-MM-DD` (`SHOP_TIMEZONE`). Times are UTC instants from the server clock.

## Behavior

### Module switch

1. A merchant has module `attendance` active when a `MerchantModule` row (merchantId, key `attendance`)
   has `enabled = true` and (`endsAt` is null or `endsAt` > now). Otherwise it is off.
2. The module catalog lives in `@rentalshop/constants` (`MODULES`): `attendance` (requires nothing).
   A later `payroll` entry declares `requires: ['attendance']`; a module whose requirement is off is off.
3. Every `/api/attendance/**` route answers 403 `MODULE_NOT_ENABLED` when the caller's merchant (or the
   kiosk token's outlet merchant) does not have `attendance` active. The check runs after auth, before
   anything else.
4. `GET /api/merchants/[id]/modules` (ADMIN, OPS) lists the catalog with `{ key, enabled, endDate, active }`.
   `PUT /api/merchants/[id]/modules/[key]` (ADMIN only, like plan-limit add-ons) body
   `{ enabled: boolean, endDate?: 'YYYY-MM-DD' | null }`; `endDate` is inclusive (stored as the end of that
   VN day). Each change writes an `AuditLog` row.
5. The login response (`/api/auth/login`, `/api/mobile/auth/login`, Google login — the shared
   `build-auth-login-response`) and `GET /api/users/profile` add `merchant.modules: string[]` (active keys).
   No other field changes. `GET /api/mobile/app-config` is unchanged (it is public and cached 5 min, so it
   cannot carry per-merchant data — see Q-A).
6. Admin merchant detail page shows a "Module" card: Chấm công · status · end date · Bật / Tắt.

### Outlet settings and kiosk link

7. `GET /api/attendance/settings?outletId=` returns `{ outletId, latitude, longitude, radiusM, configured,
   kioskToken }`. Missing row = `radiusM: 100, configured: false`.
8. `PUT /api/attendance/settings` `{ outletId, latitude, longitude, radiusM }`: MERCHANT only.
   `radiusM` integer 50–500 (else 400 validation); lat ∈ [-90, 90], lng ∈ [-180, 180].
9. `POST /api/attendance/settings/kiosk-link` `{ outletId }` (MERCHANT, OUTLET_ADMIN of that outlet)
   creates or replaces the kiosk token: 32 random bytes, base64url. The old token stops working at once.
10. `GET /api/attendance/kiosk/qr` with header `X-Kiosk-Token` (no user session, no `with*Auth`; this is the
    only public attendance route) returns `{ outlet: { id, name }, code, expiresAt, refreshAfterSec: 30,
    recent: [{ name, action: 'IN'|'OUT', at }] }` (last 5 punches of today at that outlet).
    Unknown token → 401 `UNAUTHORIZED`; module off → 403 `MODULE_NOT_ENABLED`; outlet without coordinates →
    422 `ATTENDANCE_NOT_CONFIGURED`.
11. `code` = `a1.<outletId>.<issuedAtSec>.<nonce>.<hmac>`; HMAC-SHA256 with a key derived from the existing
    `JWT_SECRET` (`HMAC(JWT_SECRET, 'attendance-qr-v1')`), so no new env var. Valid for 60 s after
    `issuedAt` (small clock skew of 5 s tolerated for a future `issuedAt`).

### Punch

12. `POST /api/attendance/punch` (any merchant role with an outlet, and MERCHANT) body
    `{ code, latitude, longitude, accuracy, isMock }`. Checks, in order; the first failure answers:
    1. module off → 403 `MODULE_NOT_ENABLED`
    2. `isMock === true` → 422 `MOCK_LOCATION`
    3. code malformed, bad signature or older than 60 s → 422 `QR_EXPIRED`
    4. QR outlet ≠ the user's outlet (MERCHANT: outlet not in its merchant) → 422 `QR_WRONG_OUTLET`
    5. outlet has no coordinates → 422 `ATTENDANCE_NOT_CONFIGURED`
    6. `accuracy` > 100 m → 422 `GPS_INACCURATE`
    7. haversine distance > `radiusM` → 422 `OUT_OF_RANGE` with `data: { distanceM, radiusM }`
13. If the user has an open record (after the lazy auto-close of rule 17) the punch closes it (`OUT`),
    otherwise it opens a new record (`IN`). OUT without IN is impossible by construction. Two punches of
    the same user are serialized (row lock on the user in one transaction).
14. The record stores server time, lat, lng, accuracy and distance for IN and for OUT.
15. Suspected fake (stored, never blocks): accuracy exactly 0; lat and lng identical to the user's
    previous punch; or speed from the previous punch > 50 m/s when the distance exceeds the two accuracies
    summed. The reasons are stored (`ZERO_ACCURACY`, `SAME_COORDS`, `SPEED`).
16. Response `{ action, record, distanceM, lateMinutes | earlyMinutes, shift }`. On IN the record is linked
    to the user's shift assignment whose window `[start − 3 h, end]` contains the instant (earliest start
    first); cross-midnight shifts of the previous day count. The record's `dateKey` is the shift's day, or
    the VN day of the IN instant when there is no shift.

### Forgot to clock out

17. An open record becomes `MISSING_OUT` once now passes its close time: end of its VN `dateKey`
    (23:59:59.999), or shift end + 4 h for a cross-midnight shift. `checkOutAt` stays null, hours = 0.
    This is applied lazily when the user punches and when records / timesheet / kiosk lists are read
    (one `updateMany` per read). No cron.

### Shifts

18. Shift templates per outlet: `GET/POST /api/attendance/shift-templates`, `PUT/DELETE
    /api/attendance/shift-templates/[id]` with `{ outletId, name, startTime 'HH:mm', endTime 'HH:mm',
    breakMinutes 0–600 }`. `crossesMidnight` = `endTime <= startTime` (computed). DELETE deactivates.
19. Assignments: `GET /api/attendance/shifts?outletId&from&to` (day keys, max 62 days),
    `POST /api/attendance/shifts` `{ outletId, items: [{ userId, date, templateId }] }` (bulk, used for
    "copy week" too), `DELETE /api/attendance/shifts/[id]`. Users must belong to that outlet. An item that
    overlaps another shift of that user on that day → 409 `SHIFT_OVERLAP`; an exact duplicate is ignored.
20. Late minutes = max(0, IN − shift start); early minutes = max(0, shift end − OUT). Display only.

### Timesheet and edits

21. `GET /api/attendance/timesheet?outletId&month=YYYY-MM` returns per user (active users of the outlet
    plus anyone with records there that month) per day: records `{ id, checkInAt, checkOutAt, status,
    hours, lateMinutes, earlyMinutes, suspectedFake, suspectReasons, edited }`, day `hours`, day
    `dayCredit` (1 if the day has ≥ 1 `DONE` record, else 0), and user totals (hours, dayCredits,
    lateCount, missingOutCount, suspectedCount).
22. Record hours = (OUT − IN) − break minutes of its shift (floor at 0), 2 decimals, no rounding rule.
    `MISSING_OUT` and `OPEN` = 0.
23. `GET /api/attendance/records?outletId&userId&from&to`; `GET /api/attendance/records/[id]` includes the
    edit history.
24. `PATCH /api/attendance/records/[id]` `{ checkInAt?, checkOutAt?, reason }` and `POST
    /api/attendance/records` `{ outletId, userId, checkInAt, checkOutAt, reason }`: instants are ISO 8601
    with an offset; `reason` 1–500 chars required; `checkOutAt` > `checkInAt` and ≤ 24 h later; status
    becomes `DONE` when both are set. Each change writes `AttendanceEdit` (before, after, reason, editor).
25. `GET /api/attendance/timesheet/export?outletId&month` returns an `.xlsx` (existing
    `createExcelWorkbook`): one row per record (Nhân viên, Ngày, Vào, Ra, Giờ, Công, Muộn, Sớm, Ghi chú)
    and a total row per user.
26. `GET /api/attendance/me` (any role with the module): `{ openRecord, todayShifts, configured }` for the
    app's one button; staff read their own month with `records` / `shifts` (scoped automatically).

### Roles (API, `userScope`)

27. MERCHANT: everything for every outlet of its merchant. OUTLET_ADMIN: shifts, templates, records,
    edits, kiosk link, timesheet, export for its own outlet; settings read-only (cannot change coordinates
    or radius). OUTLET_STAFF / OUTLET_INVENTORY: punch, `me`, and read their own records and shifts only
    (any `userId` / other outlet → 403). ADMIN / OPS: only the module switch routes. Another merchant's
    outlet, user, template, shift or record → 404.

### Errors

28. New codes with entries in `locales/{en,vi,ja,ko,zh}/errors.json`: `MODULE_NOT_ENABLED`, `QR_EXPIRED`,
    `QR_WRONG_OUTLET`, `OUT_OF_RANGE`, `GPS_INACCURATE`, `MOCK_LOCATION`, `ATTENDANCE_NOT_CONFIGURED`,
    `SHIFT_OVERLAP`.

## Out of scope

Payroll (pay profiles, payslips, month lock), pricing / selling the module, the shop web screens (QR page,
shifts, timesheet, settings), iOS / Android, offline punch, device binding, multi-outlet staff, holidays,
half days, rounding, push notifications.

## API and data

New tables (additive migration):

- `MerchantModule` — merchantId, key, enabled, endsAt?, updatedById?, timestamps; unique (merchantId, key).
- `AttendanceSetting` — outletId (unique), merchantId, latitude?, longitude?, radiusM (100), kioskToken? (unique), kioskTokenAt?.
- `ShiftTemplate` — merchantId, outletId, name, startTime, endTime, breakMinutes, isActive.
- `ShiftAssignment` — merchantId, outletId, userId, dateKey, templateId, createdById; unique (userId, dateKey, templateId).
- `AttendanceRecord` — merchantId, outletId, userId, dateKey, shiftAssignmentId?, checkInAt, checkOutAt?,
  status (`OPEN`/`DONE`/`MISSING_OUT`), in/out lat, lng, accuracy, distanceM, suspectedFake,
  suspectReasons?, source (`PUNCH`/`MANUAL`), autoClosedAt?; index (userId, status), (outletId, dateKey).
- `AttendanceEdit` — recordId, editedById, before Json?, after Json, reason, createdAt.

Existing responses: only `merchant.modules` is added (login, profile). Everything else is new routes.

## Open questions (do not block the API shape)

- Q-A: `app-config` is public and cached (`max-age=300`). Proposal: modules only in login / profile (the web
  and both apps already read the profile). Adding it to app-config would need the token and no cache.
- Q-B: Kiosk token stored as-is so the owner can copy the link again (it only shows QR codes; punching
  still needs a login + GPS). Alternative: store a hash and show the link once.
- Q-C: Only ADMIN toggles (same as plan-limit add-ons); OPS read-only. OK?
- Q-D: May an OUTLET_ADMIN edit their own records? Proposal: yes, every edit has a reason and history.
- Q-E: A forged / malformed QR answers `QR_EXPIRED` ("quét lại") rather than a separate code. OK?
- Q-F: Day keys use `SHOP_TIMEZONE` (Asia/Ho_Chi_Minh) like the rest of the API, not `Merchant.timezone`.

## Acceptance

- [ ] Each behavior line has a test in `plan.md` (unit, route, or business e2e)
- [ ] iOS / Android: no change needed now (new field ignored; screens in a later part)
- [ ] 8 error codes in all five locales
- [ ] VN civil days at the 16:59:59Z / 17:00:00Z boundary; tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
