# Plan — #1219

1. Test đỏ (commit riêng): `tests/deposit-plan.test.ts` — 12M→13M đã thu i1 đủ (PAID), giảm tổng (PAID), chưa thu (không đổi), thu thiếu thật vẫn PARTIAL, dòng không có metadata như cũ; revert: RESERVED + `pickupTotalAmount` cũ + `pickedUpAt` null đo theo tổng mới.
2. Sửa `packages/utils/src/core/deposit-plan.ts` (`PlanPaymentLike.metadata`, `collectedFor` đọc `plannedAmount`, `statusOf`) và route collect ghi `plannedAmount`.
3. Chạy jest dưới TZ=UTC và TZ=Asia/Ho_Chi_Minh, type-check, lint; tái hiện lại trên API local cổng 3250.
4. Dòng `.agent/api-changes/LOG.md`, PR vào `dev`, `Fixes #1219`.
