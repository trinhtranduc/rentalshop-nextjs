# #960 Spec

## Side menu (owner option A, mockup 9b56KwErJWiGpiyFEfyEY4#sidenav)
- `SHELL_NAV_GROUPS`: Tổng quan (no header) · BÁN & CHO THUÊ (Đơn hàng, Lịch giao trả, Kiểm tra còn hàng) ·
  HÀNG HOÁ (Sản phẩm, Danh mục) · KHÁCH HÀNG (Khách hàng, Khách thân thiết) · NHÂN SỰ (Nhân viên, Chấm công) ·
  CỬA HÀNG (Chi nhánh, Cài đặt cửa hàng). Header label `shell.groups.<key>`.
- Visibility per item is unchanged (`filterNavForRole`). `filterNavGroups` drops a group whose items are all
  hidden, so its header disappears (staff: no NHÂN SỰ).
- One highlighted row: `navItemTone` — hover uses a lighter background than the active row (the old hover
  colour was nearly the active one, so two rows looked selected).

## Sub-menu (generic)
- `ShellNavItem.children` (optional): `{ key, href, exact?, also? }`; `keepQuery` lists query keys a sub-item
  link carries over. Any item can have children; only Chấm công has them now:
  Bảng công `/attendance` (exact, also `/attendance/person`), Xếp ca, Mẫu ca, Mã QR & vị trí (+ `/…/{id}`).
- Chi tiết theo người is not a menu row: it opens from Bảng công; while on it Bảng công is highlighted.
- `activeNavChild` picks the active sub-item. The group opens itself on its pages and the header toggles it.
- Same component in the desktop sidebar and the mobile drawer.

## Attendance pages
- The top tab strip is removed everywhere; the back links stay.
- Every attendance dropdown uses `Select` (appearance-none, own chevron, `pr-9`).

## Top bar
- Left: breadcrumb `buildBreadcrumb(pathname, tail?)`: menu item › active sub-item › rest of the path (known
  words get `shell.crumbs.*`, anything else `#id`). Every crumb links except the last; `/outlets/{id}` has no
  page, so no link. A page can name the last crumb (`useBreadcrumbTail`): Chi tiết theo người →
  "Chấm công › Bảng công › <tên người>". Narrow screens hide middle crumbs; the last one truncates.
- Right: search icon (+ theme, bell). Icon or "/" (not while typing, no modifier) opens a popover with the same
  form (submit → `/orders?q=`); Escape or a click outside closes it.

## i18n
`common.shell.nav.attendanceSub.*`, `shell.groups.*`, `shell.crumbs.*`, `shell.breadcrumb`, `shell.searchOpen`
in en / vi / ja / ko / zh. Removed unused `shell.manage` and `attendance.tabs`.
