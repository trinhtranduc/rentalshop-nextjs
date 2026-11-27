# Plan #1688

PR 1 (API + web, #1688):
1. Test đỏ: `tests/api/order-cancel-returned.test.ts` (PATCH và PUT, vai trò, đơn thường và đơn có kế hoạch cọc, xoá sau huỷ), cập nhật `order-status-transitions` và `web-orders-actions`.
2. `packages/constants/src/status.ts`: `RENT.RETURNED → [CANCELLED]`.
3. `apps/api/lib/order-cancel-returned.ts` + gọi ở hai route: nhân viên `403 INSUFFICIENT_PERMISSIONS`.
4. Web: `canCancelOrder`.
5. `api-compat-review` trong PR, dòng `LOG.md`.

PR 2 (iOS + Android, issue riêng): nút Huỷ cho đơn thuê đã trả.
