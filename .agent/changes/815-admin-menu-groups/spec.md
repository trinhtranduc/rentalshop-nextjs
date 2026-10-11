# Spec #815

- `nav.ts`: mỗi mục có `group` (một trong 6) và `inline` (Subscription, Plans hiện mục con thẳng, không mở rộng). Thứ tự mảng theo nhóm.
- `nav-groups.ts` (thuần, không import icon): `NAV_GROUPS`, `groupNavItems(items)` bỏ nhóm rỗng.
- `AdminSideNav.tsx`: bộ lọc `filterAdminMenuByRole` chạy trên `ADMIN_NAV` như cũ, rồi nhóm lại; tiêu đề nhóm không bấm được; Blog và Settings vẫn mở rộng.
- Test: `tests/admin-menu-groups.test.ts` (đủ 22 route cũ, 6 nhóm đúng thứ tự, nhóm rỗng ẩn).
