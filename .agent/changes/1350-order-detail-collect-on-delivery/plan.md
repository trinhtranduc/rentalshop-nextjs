# Plan — Chi tiết đơn: "Thu khi giao"

Issue: #1350 · Status: in-progress · Spec: ./spec.md

## Steps

1. Test đỏ (commit riêng, kèm hàm khung trả về số cũ): iOS `OrderDetailLogicTests`, Android `OrderDetailLogicTest`. Chạy để thấy đỏ.
2. `OrderDetailLogic.collectOnDeliveryShown` (iOS, Android) gọi `ShareMoneyRule.collectOnDelivery`; dòng "Thu khi giao" của mục thanh toán dùng nó.
3. Verify: iOS `xcodebuild test -only-testing:POS ADBDTests/OrderDetailLogicTests`, Android `:app:assembleDebug :app:testDebugUnitTest --tests OrderDetailLogicTest`; chụp ảnh với API cục bộ.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrderDetailLogic.swift`, `Viewcontrollers/OrderDetail/OrderDetailViewController.swift`, `POS ADBDTests/OrderDetailLogicTests.swift`
- `apps/mobile-android/.../domain/orders/OrderDetailLogic.kt`, `ui/orders/v2/OrderDetailV2Screen.kt`, `OrderDetailLogicTest.kt`

## Risks

Nút "Giao đồ · thu X" vẫn ghi số cũ (920.000) khi còn đợt chưa thu, khác dòng trong mục thanh toán. API chặn giao lúc đó nên số đề nghị chưa dùng được; ghi trong PR, không tự đổi.

## Rollback

Revert PR; dòng trở lại tổng − đã thu.
