# Plan — Sẵn sàng giao on the new order detail

Issue: #470 · Status: accepted · Spec: ./spec.md

## Steps

1. Tests first (red):
   - iOS `POS ADBDTests/OrderDetailLogicTests.swift`: `showsReadyToDeliver` true only for RENT+RESERVED
     with `orders.update`; `UpdateOrderRequest.updateReadyToDeliver(true)` encodes to exactly
     `{"isReadyToDeliver":true}`.
   - Android `test/.../ui/orders/ReadyToDeliverTest.kt`: `OrderDetailLogic.showsReadyToDeliver` same
     table; `ApiParity.readyToDeliverBody(true)` is `{"isReadyToDeliver":true}`; the view model calls the
     source with the new value, reloads on success, reports failure without reloading.
2. iOS: `OrderDetailLogic.showsReadyToDeliver`; row in `OrderDetailViewController.infoRows` using
   `OrderViewModel.updateReadyToDeliverStatus` (same call as `PreviewViewController.readyDeliverTapped`).
3. Android: `OrderDetailLogic.showsReadyToDeliver`; `ApiParity.readyToDeliverBody` used by
   `setReadyToDeliver`; `OrderDetailSource.setReadyToDeliver`; `OrderDetailV2ViewModel.setReadyToDeliver`;
   row in `DetailBody`.
4. Strings (`i18n-keys`, mobile only): iOS `"order.readyToDeliver.subtitle"`, Android
   `detail_ready_to_deliver_subtitle`, vi + en. Title reuses `"Ready deliver"` / `ready_to_deliver`.
5. Verify (`verify-change`): iOS build + `POS ADBDTests` on a spare simulator; Android
   `:app:testDebugUnitTest :app:assembleDebug`.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrderDetailLogic.swift` — visibility rule
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderDetailViewController.swift` — row + toggle
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings` — subtitle
- `apps/mobile/POS ADBDTests/OrderDetailLogicTests.swift` — tests
- `apps/mobile-android/.../domain/orders/OrderDetailLogic.kt` — visibility rule
- `apps/mobile-android/.../data/ApiParity.kt` — body builder (same payload)
- `apps/mobile-android/.../ui/orders/v2/OrderDetailV2ViewModel.kt` — save + reload
- `apps/mobile-android/.../ui/orders/v2/OrderDetailV2Screen.kt` — row
- `apps/mobile-android/app/src/main/res/values{,-vi}/strings.xml` — subtitle
- `apps/mobile-android/app/src/test/...` — tests and fakes of `OrderDetailSource`

## Risks

- None for the API (no change). Fakes of `OrderDetailSource` in tests need the new method.

## Rollback

Revert the PR; the old screens still set the flag.
