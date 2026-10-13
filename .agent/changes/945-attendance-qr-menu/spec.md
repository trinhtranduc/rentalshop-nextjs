# #945 Spec

Status: done

1. Chấm công tabs: Bảng công, Chi tiết theo người, Xếp ca, Mẫu ca, **Mã QR & vị trí** (`/attendance/locations`).
   Shown only when the shop has the `attendance` module and the role is MERCHANT or OUTLET_ADMIN (same gate as
   the other tabs). Active on `/attendance/locations` and `/attendance/locations/{id}`.
2. `/attendance/locations`: table of branches in scope (outlet admin: its own branch only, as `useOutlets`):
   name, address, QR status (Có mã QR · đổi mỗi ngày / cố định, or Chưa tạo mã), radius `N m`, "Mở ›".
   Data: existing `GET /api/attendance/settings?outletId=` per branch (radius is not in the list response).
3. `/attendance/locations/{id}`: the old branch attendance page unchanged, back link "‹ Mã QR & vị trí",
   with the Chấm công tab strip.
4. `/outlets/{id}/attendance` → server redirect to `/attendance/locations/{id}`.
5. `/outlets`: no "Chấm công" column / tag and no "Mở ›" button; no attendance API call.
6. Chi nhánh is owner-only again: no sidebar item for OUTLET_ADMIN (the #908 `alsoWithModule` exception is
   removed), and `/outlets` opened directly by a non-owner shows the no-access card (same pattern as Nhân viên).
   Strings `outlets.web.noAccess` in vi/en (ja/ko/zh load the en outlets file).

## Decision log
- Owner (13/10/26, after review): outlet admins no longer see "Chi nhánh"; the page is guarded too.
- The list shows active branches (same `useOutlets` as the other Chấm công tabs); owner confirmed.
- Error hints `ATTENDANCE_NOT_REQUIRED(_NAMED)` pointed at "Chi nhánh › Chấm công › Ai cần chấm công"; the web
  locale text now says "Chấm công › Mã QR & vị trí › Ai cần chấm công" (code unchanged; web locales only).
