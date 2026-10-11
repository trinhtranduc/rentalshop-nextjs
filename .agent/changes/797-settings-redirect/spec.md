# Spec #797

- Mọi link của `AdminSidebar` có trang. `/settings/admin` (Settings → Admin Info) là trang chỉ đọc: tên, email, role của admin đang đăng nhập.
- `/settings` chuyển tới `/settings/admin`.
- Test: `tests/admin-settings-page.test.ts` (mỗi href của sidebar phải có `page.tsx`).
