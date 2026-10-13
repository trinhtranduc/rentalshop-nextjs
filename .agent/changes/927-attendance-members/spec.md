# #927 spec

## Data
`User.attendanceRequired Boolean?` — null = role default (`OUTLET_STAFF`, `OUTLET_INVENTORY` → true; else false).
Migration adds the nullable column only.

`required(user) = user.attendanceRequired ?? DEFAULT_ROLES.includes(user.role)`.

## Members of an outlet
Active, not deleted users with `outletId = outlet` and an outlet role, plus the merchant's active `MERCHANT`
users (they punch at any outlet). Order: staff / inventory, outlet admin, owner, then id.

## Routes (MERCHANT; OUTLET_ADMIN own outlet; module gate first)
- `GET /api/attendance/members?outletId` → `{ items: [{ userId, name, role, required, isDefault }] }`.
- `PUT /api/attendance/members` `{ outletId, userId, required }` → the item. Stores null when `required`
  equals the role default (so `isDefault` is true again), else the boolean. User not a member → 404
  `USER_NOT_FOUND`. OUTLET_ADMIN changing a `MERCHANT` row → 403 `INSUFFICIENT_PERMISSIONS` (the owner's flag
  is shop-wide).
- `GET /api/attendance/me` adds `required: boolean`.
- `POST /api/attendance/shift-rules`, `PUT /api/attendance/shift-rules/[id]`, `PUT /api/attendance/shifts/day`
  (template or custom hours; `off: true` stays allowed) for a not-required user → 409 `ATTENDANCE_NOT_REQUIRED`
  with `data.users: [{ id, name }]`, `messageParams.names`. Stop / delete stay allowed.
- `POST /api/attendance/punch`: IN (no open record) by a not-required user → 403 `ATTENDANCE_NOT_REQUIRED`
  before the QR / GPS checks, no scan row. OUT of an open record works as before.
- `GET /api/attendance/shifts` (managers, no `userId`) and `GET /api/attendance/timesheet` (+ export):
  required members + anyone with records in the period (shifts: `from..to`; timesheet: the month).
  `resolveOutletUser` accepts any `MERCHANT` of the shop (owner rows in shifts / person month).
- `/people/[userId]/month` is per person: unchanged (anyone with records stays reachable).

## Web
Chi nhánh → Mở › Chấm công page: card "Ai cần chấm công ở chi nhánh này" — one checkbox per member,
role label, hint text from the mockup. Save on toggle (PUT), toast on error. OUTLET_ADMIN sees the owner row
disabled. Xếp ca / Bảng công follow the API lists. Assigning a not-required person shows the translated
`ATTENDANCE_NOT_REQUIRED` toast.

## i18n
`ATTENDANCE_NOT_REQUIRED` (+ `_NAMED`) in `errors.json` ×5 and web keys ×5.
