# Plan — "Khách đưa lúc nhận đồ"

Issue: #1368 · Status: done · Spec: ./spec.md

## Steps

1. Khung rỗng (hàm trả `nil`, mục `.cash` chưa vẽ) + test đỏ, chạy để thấy đỏ; commit `test(mobile): reproduce ...`.
2. iOS: `ShareMoneyRule.cashAtHandover`, `OrderShareModel.make` (đơn thuê + nháp), `OrderShareRenderer` (.cash), `OrderDetailLogic.handOverCash`, `OrderDetailViewController.moneySections`, chuỗi.
3. Android: `ShareMoneyRule.cashAtHandover`, `OrderShareModel.from/fromDraft`, `OrderShareRenderer`, `OrderDetailLogic.handOverCash`, `OrderDetailV2Screen`, chuỗi.
4. Verify: `xcodebuild test -only-testing:POS ADBDTests/OrderShareMoneyOrderTests,OrderDetailLogicTests,OrderShareImageTests`; `./gradlew :app:assembleDebug :app:testDebugUnitTest`; chụp ảnh với API cục bộ.

## Files

- iOS: `POS ADBD/Model/OrderShareImage.swift`, `Utils/OrderShareRenderer.swift`, `ViewModels/OrderDetailLogic.swift`, `Viewcontrollers/OrderDetail/OrderDetailViewController.swift`, `en.lproj` + `vi-VN.lproj/Localizable.strings`, `POS ADBDTests/OrderShareImageTests.swift`, `OrderDetailLogicTests.swift`
- Android: `domain/orders/OrderShareModel.kt`, `OrderDetailLogic.kt`, `ui/orders/OrderShareRenderer.kt`, `ui/orders/v2/OrderDetailV2Screen.kt`, `res/values{,-vi}/strings.xml`, `OrderShareMoneyOrderTest.kt`, `OrderDetailLogicTest.kt`

## Risks

Nút "Giao đồ · thu …" vẫn ghi `handOver.due` khi còn đợt chưa thu (khác dòng 5). Đợt PARTIAL: dòng 5 không gồm phần thiếu. Ghi trong PR.

## Rollback

Revert PR; dòng trở lại như #1350.

## Phát hiện (ghi trong PR, không sửa ở đây)

- Khi còn đợt chưa thu, nút "Giao đồ · thu …" vẫn ghi `handOver(...).due` (ví dụ 1.100.000 = 1.000.000 − 200.000 + 300.000), khác dòng "Khách đưa lúc nhận đồ" 800.000. Khi các đợt đã thu hết: nút = dòng 5 = 800.000 (có test và ảnh chụp). Không đổi nút.
- Đợt PARTIAL (thu thiếu): dòng 5 theo kế hoạch (số đợt `amount`), không gồm phần thiếu của đợt đó.
- Đã có khoản thu PICKUP trước (`paidBefore > 0`): chi tiết đơn giữ các dòng cũ (hàm trả `nil`).

## Kết quả

Test đỏ trước (iOS 32 lỗi, Android 19 ca), xanh sau (iOS 211 test, Android 1031 test). Ảnh: `~/Documents/AnyRent-shots/handover-cash/`.
