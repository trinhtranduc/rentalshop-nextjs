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
6. Sidebar nav unchanged (decision log).

## Decision log
- Outlet admin keeps the sidebar "Chi nhánh" entry while the module is on (#908 `alsoWithModule`): the issue
  says permissions stay the same, and the outlet admin can still edit its own branch info there (#824).
- The list shows active branches (same `useOutlets` as the other Chấm công tabs).
- Error hints `ATTENDANCE_NOT_REQUIRED(_NAMED)` pointed at "Chi nhánh › Chấm công › Ai cần chấm công"; the web
  locale text now says "Chấm công › Mã QR & vị trí › Ai cần chấm công" (code unchanged; web locales only).
