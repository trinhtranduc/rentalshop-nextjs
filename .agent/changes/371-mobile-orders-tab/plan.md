# Plan — Mobile orders tab

Issue: #371 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS: `Model/TodayWork.swift`, `APIEndpoint.Path.outletOperations`, `AnalyticsAPIService.loadOutletOperations`,
   `ViewModels/OrdersHomeViewModel.swift` with pure helpers, tests in `POS ADBDTests`.
2. iOS UI: `Viewcontrollers/Orders/` (controller, row cell, filter sheet); swap in `TabbarViewController` by flag.
3. Android: `domain/orders/TodayWorkModels.kt`, `data/repository/DefaultTodayWorkRepository.kt`,
   `ui/orders/v2/` (ViewModel, screen); swap in `AnyRentNavHost` by flag; unit tests.
4. Strings vi/en on both apps. Debug-only Android network config for a local API.
5. Skills: `timezone-dates`, `mobile-parity`, `i18n-keys`.

## Verify

```bash
cd apps/mobile && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'platform=iOS Simulator,name=iPhone 17 Pro' test
cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
```
Manual: local API with `MOBILE_FEATURES=newOrders`, seeded late / today / tomorrow / sale orders.

## Risks

- Older API without `tomorrow*` → group hidden.
- Staff without dashboard permission → 403 handled.

## Rollback

Turn `newOrders` off in app-config; the old screen returns on next launch.
