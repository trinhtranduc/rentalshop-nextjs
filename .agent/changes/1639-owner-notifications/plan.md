# Plan — Chủ shop nhận thông báo đơn của mọi chi nhánh

Issue: #1639 · Status: draft · Spec: ./spec.md

## Steps
1. Test trước (`tests/api/order-notification-recipients.test.ts`): bảng 1–8 của spec trên `db` giả.
2. `packages/database/src/notifications.ts`: thêm `findOrderNotificationRecipients(outletId)` → `{ userIds, merchantOutletCount, outletName }`.
3. `apps/api/lib/push-notifications.ts`: `sendOrderPushToOutlet` dùng danh sách đó cho hộp thư và `findActivePushTokensForUsers`; thêm đuôi tên chi nhánh; `notifyOutletBookingRequest` dùng lại hàm (hành vi không đổi).
4. `.agent/api-changes/LOG.md`: dòng #1639.
5. Verify: `cd tests && TZ=UTC yarn test order-notification` và `TZ=Asia/Ho_Chi_Minh`; `npx tsc --noEmit -p apps/api/tsconfig.json` không thêm lỗi; test đơn hiện có (mock `notifyOutletOrderEvent`) vẫn qua.

## Risks
Shop nhiều chi nhánh, nhiều đơn: chủ shop nhận nhiều thông báo hơn. Push theo user thay vì theo chi nhánh: token của user đã bị khoá không còn nhận (đúng ý).

## Rollback
Revert PR; không dữ liệu nào đổi.
