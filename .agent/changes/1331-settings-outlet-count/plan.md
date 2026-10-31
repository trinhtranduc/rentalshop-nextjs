# Plan #1331

1. Test đỏ: `SettingsV2ViewModelTest` (Android), `Phase7GapsTests` (iOS).
2. Android: `ShopBranchCount` trong `SettingsV2ViewModel.kt`, `ShopAndBranchesScreen` báo số.
3. iOS: `.shopBranchCountDidChange`, `ShopInfoViewController` báo số, `SettingsV2ViewController` nhận.
4. Verify: `./gradlew :app:testDebugUnitTest --tests '*SettingsV2ViewModelTest'`, `xcodebuild test` scheme Development, xem trên Simulator.
