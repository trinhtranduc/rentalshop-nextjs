# Plan — #1307

1. Test đỏ (commit riêng): iOS `ShopCurrencyRefreshTests` trong `FormattersTests.swift`; Android `CurrencySettingTest`.
2. iOS: thêm `canRefresh` / `shouldRefresh` vào `ShopCurrencyLogic`; `ShopCurrencyStore.refresh` dùng chúng; bỏ guard ở
   `SettingsV2ViewController.refreshCurrency`; gọi `refresh()` ở `applicationWillEnterForeground` và `OverviewV2ViewController.viewWillAppear`.
3. Android: thêm `canRefresh` / `shouldRefresh` vào `CurrencySetting`; `ApiClient.refreshCurrency` throttle 1 phút; gọi từ `MainActivity.onResume`
   và `OverviewV2Screen`; Cài đặt dùng cùng hàm.
4. Verify: unit test iOS + Android, `xcodebuild build`, `./gradlew :app:assembleDebug`.
