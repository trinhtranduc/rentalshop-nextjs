# Plan — Mobile: a rent order from the new cart cannot be handed over

Issue: #427 · Status: approved · Spec: ./spec.md

## Root cause

`OrderViewModel.handlePickup` (iOS) returns an error when `materialText` is empty and
`securityDeposit == 0`, before any request. The v2 detail (`OrderDetailViewController.changeStatus`)
reuses `saveOrder`, and the v2 sheet has no input for either value.

## Steps

1. Tests first, committed red (`test(mobile): … (#427)`):
   - iOS `POS ADBDTests/HandOverCollateralTests.swift`: `OrderViewModel.handOver(papers:securityDeposit:)`
     with an injected updater sends `{"status":"PICKUPED"}` for empty input and the collateral keys for
     "CCCD"/500; the old-flow message is localized.
   - Android `HandOverCollateralTest.kt`: `ApiClient.updateOrderStatus` body with/without the fields
     (fake OkHttp), `OrderDetailLogic.handOverFields`, and `OrderDetailV2ViewModel.handOver` with a fake source.
2. iOS fix: `OrderViewModel.handOverRequest` + `handOver(...)` (no block), `pickupBlockMessage` (localized)
   for the old flow; sheet fields + `onHandOver` callback; detail screen calls `handOver`.
3. Android fix: `OrderDetailLogic.handOverFields`, `ApiClient.updateOrderStatus(..., fields)`,
   `OrderDetailSource.handOver`, VM `handOver`, sheet fields, payment amount from the sheet.
4. Strings: iOS `en`/`vi-VN` `Localizable.strings` (`plutil -lint`), Android `values`/`values-vi`.
5. Verify: iOS `-only-testing:"POS ADBDTests"` (iPhone 16e), Android
   `:app:testDebugUnitTest :app:assembleDebug`, manual hand-over on both against API :3196, DB rows.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrderViewModel.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderHandOverSheetViewController.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderDetailViewController.swift`
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings`
- `apps/mobile/POS ADBDTests/HandOverCollateralTests.swift` (new)
- `apps/mobile-android/.../domain/orders/OrderDetailLogic.kt`, `data/ApiClient.kt`,
  `ui/orders/v2/{OrderDetailV2ViewModel,OrderDetailV2Sheets,OrderDetailV2Screen}.kt`, `res/values{,-vi}/strings.xml`
- `apps/mobile-android/app/src/test/.../HandOverCollateralTest.kt` (new)

## Risks

- Old iOS screen must behave as before (same check, now localized).

## API compatibility (installed apps)

No API change.

## Rollback

Revert the commits; the old behavior (blocked hand-over on iOS v2) comes back.
