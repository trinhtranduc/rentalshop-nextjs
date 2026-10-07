# Plan — Mobile order detail

Issue: #372 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS pure logic `ViewModels/OrderDetailLogic.swift` (actions, money, notes plan, status error) + tests.
2. iOS `Viewcontrollers/OrderDetail/` (detail controller, hand-over/return sheet), `OrderDetailRouter`
   used by every place that pushed `PreviewViewController(order:)`; `OrderEditLauncher` from the
   SaleViewController swipe code. `UpdateOrderRequest.lateFee`. `NoteViewController.maxAttachmentCount` settable.
3. Android pure logic `domain/orders/OrderDetailLogic.kt` + tests; `ui/orders/v2/OrderDetailV2Screen.kt`,
   `OrderDetailV2ViewModel.kt`, sheets; flag swap on `Routes.OrderDetail`; shared `editOrderIntoCart`.
4. Android old screen: show status errors (`OrdersScreens.kt`), remove + send kept note photos
   (`ApiParity.updateOrderDetails`).
5. Strings vi/en both apps. Skills: `timezone-dates`, `mobile-parity`, `i18n-keys`.

## Verify

```bash
cd apps/mobile && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -only-testing:"POS ADBDTests" test
cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
```
Manual: local API with `MOBILE_FEATURES=newOrders,newOrderDetail`; RESERVED → hand-over, PICKUPED late → return,
sale → cancel, a forced invalid status (stale screen), notes add/remove; flag off shows the old screens.

## Risks

- Money mismatch with the list → same rule as the API, unit-tested.
- Stale screen after another device changed status → 4xx reload.

## Rollback

Turn `newOrderDetail` off in app-config; the old screens return on next launch.
