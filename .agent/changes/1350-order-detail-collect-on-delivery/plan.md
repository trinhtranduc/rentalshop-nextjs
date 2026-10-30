# Plan — Chi tiết đơn: "Thu khi giao"

Issue: #1350 · Status: done · Spec: ./spec.md

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

## Phát hiện (ghi trong PR, không sửa ở đây)

- Khi còn đợt chưa thu, nút "Giao đồ · thu 920.000" (iOS/Android) và sheet giao hàng vẫn dùng `handOver(...).due` nên ghi 920.000, trong khi dòng "Thu khi giao" ghi 575.000. API chặn giao lúc đó (`INSTALLMENT_UNPAID_AT_PICKUP`), nên số này chưa dùng được; thu đợt 2 xong cả hai bằng 575.000. Chờ chủ shop quyết có đổi nút theo hay không.
- Với thế chân > 0: số hiển thị khi còn đợt chưa thu KHÔNG cộng thế chân (theo quyết định), còn sau khi thu đợt 2 số quay lại `handOver(...).due` (có cộng thế chân).
- Web `buildPaySummary` (`apps/client/app/orders/orders-model.ts:523`) ghi cùng 920.000, nhưng web thu các đợt chưa thu ngay trong hộp giao hàng (`page.tsx confirmPickup`), nên số đó đúng với luồng web. Không sửa; đề xuất issue riêng nếu muốn thống nhất.

## Kết quả

Test đỏ trước (6 ca mỗi nền tảng), xanh sau: iOS `OrderDetailLogicTests` 36, `OrderShareImageTests`, `ProductsV2Tests`; Android `testDebugUnitTest`. Ảnh: `~/Documents/AnyRent-shots/collect-delivery/`.
