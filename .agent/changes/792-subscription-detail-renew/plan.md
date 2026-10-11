# Plan #792

1. Test đỏ trước (`tests/admin-subscription-detail.test.ts`).
2. Sửa `apps/admin/app/subscriptions/[id]/page.tsx`, `edit/page.tsx`, `create/page.tsx`; thêm `delete` vào `packages/utils/src/api/subscriptions.ts`.
3. Kiểm tra bằng Chrome 390×844 với API local từ `dev`: có Renew/Suspend/Cancel/Delete, dialog Renew vừa màn hình, Edit và Manage Addons mở đúng trang.
