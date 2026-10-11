# Spec #792

- Thêm nút **Renew** (mở `ManualRenewalModal`, gọi `subscriptionsApi.renew`, thành công thì tải lại). Disabled khi subscription `CANCELLED`.
- Mọi `router.push('/admin/...')` trong `apps/admin/app/subscriptions/**` thành `/...` (admin không có tiền tố `/admin`).
- Trạng thái so sánh không phân biệt hoa thường (API trả `ACTIVE`): Suspend và Cancel hiện khi `ACTIVE`.
- Thêm `subscriptionsApi.delete(id)` → `DELETE /api/subscriptions/[id]` (route có sẵn).
- Test: `tests/admin-subscription-detail.test.ts`.
