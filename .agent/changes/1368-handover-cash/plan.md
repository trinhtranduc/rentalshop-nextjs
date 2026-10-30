# Plan — "Khách đưa lúc nhận đồ"

Issue: #1368 · Status: in-progress · Spec: ./spec.md

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
