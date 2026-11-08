# Plan — Sheet hủy đơn có ô Phụ thu rõ ràng

Issue: #1496 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS: `DepositPlanViews.swift` (`CancelDepositOrderSheet`: ô có khung, focus, hoàn khách chỉ đọc), chuỗi `deposit.cancel.kept`, `deposit.cancel.hint`.
2. Android: `DepositPlanViews.kt` (ô tự focus, hoàn khách là `Text`), chuỗi.
3. Web: `locales/{en,vi}/orders.json` (`installments.cancelKept`, `cancelHint`, `cancelHintStaff`); hộp thoại đã có ô khung và tự focus ô đầu.
4. Xác minh: `yarn --cwd tests test web-installments web-orders locales-valid-json`; iOS `DepositPlanTests` + UI `test5oCancelWithFee`; Android `DepositPlanTest` + `Issue518519ResourcesTest`; web e2e `tests/e2e/web/cancel-fee.web.js` (chọn ô theo nhãn "Phụ thu").

## Files

`apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/DepositPlanViews.swift`, `{en,vi-VN}.lproj/Localizable.strings`, `apps/mobile-android/.../ui/orders/v2/DepositPlanViews.kt`, `values{,-vi}/strings.xml`, `locales/{en,vi}/orders.json`, `tests/e2e/web/cancel-fee.web.js`.

## Risks

Bàn phím tự bật che phần trên của sheet (tiêu đề cuộn khỏi màn hình); nút xác nhận vẫn thấy. Đơn cọc theo đợt đổi nhãn theo.

## Rollback

Revert PR (không có migration, không có dữ liệu mới).
