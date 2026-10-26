# Plan — #1230

1. Commit refactor không đổi hành vi: `recordInstallmentPayment(tx, args)` dùng chung (cả 2 route gọi), metadata như cũ.
2. Commit test đỏ: `tests/installment-payment-metadata.test.ts` (gọi hàm với tx giả như route tạo đơn; ghép với `effectivePlan` 12M→13M) + ca trong `tests/deposit-plan.test.ts`.
3. Commit sửa: hàm ghi `plannedAmount`.
4. Jest dưới TZ=UTC và TZ=Asia/Ho_Chi_Minh so với baseline; type-check; tái hiện trước/sau bằng API local cổng 3310.
5. Dòng `.agent/api-changes/LOG.md`, PR vào `dev`, `Fixes #1230`.
