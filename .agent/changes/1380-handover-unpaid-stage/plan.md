# Plan

Issue: #1380 · Spec: ./spec.md

1. Hàm `blocksHandOver` còn trả `false` + test đỏ (iOS, Android); commit `test(mobile): ...`.
2. iOS: hàm thật, `renderActions`, chuỗi. Android: hàm thật, `DetailBottomBar`, chuỗi.
3. Verify: `xcodebuild test -only-testing:POS ADBDTests/DepositPlanTests`, `./gradlew :app:assembleDebug :app:testDebugUnitTest`, chạy một lần trên Simulator và AVD có cửa sổ với API cục bộ.

## Files

- iOS: `Model/DepositPlan.swift`, `Viewcontrollers/OrderDetail/OrderDetailViewController.swift`, `en.lproj` + `vi-VN.lproj/Localizable.strings`, `POS ADBDTests/DepositPlanTests.swift`, `POS ADBDUITests/AnyRentE2ETests.swift`
- Android: `domain/deposit/DepositPlan.kt`, `ui/orders/v2/OrderDetailV2Screen.kt`, `res/values{,-vi}/strings.xml`, `domain/deposit/DepositPlanTest.kt`

## Rủi ro

Mất bước tự mở sheet giao sau khi thu đợt qua nút Giao đồ: giờ là hai bước (ghi trong issue).

## Rollback

Revert PR.
