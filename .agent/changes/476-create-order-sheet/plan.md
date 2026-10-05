# Plan — Create the order from a confirm sheet on the new cart

Issue: #476 · Status: accepted · Spec: ./spec.md

## Steps

1. Tests first (fail): iOS `POS ADBDTests/ProductsV2Tests.swift`, Android
   `app/src/test/.../domain/orders/CreateOrderSheetTest.kt`.
2. iOS: logic in `Model/ProductsV2.swift` (`CreateOrderSheetLogic`, `CreateOrderSubmission`, `CartV2Logic.ctaRoute`);
   sheets in `Viewcontrollers/Products/v2/ProductsV2Views.swift` (`CreateOrderConfirmSheet`, `OrderCreatedSheet`);
   `Viewcontrollers/Products/v2/CartV2ViewController.swift` (CTA, submit, success routes); strings in
   `en.lproj` / `vi-VN.lproj`.
3. Android: `domain/orders/CreateOrderSheet.kt` (logic + submission), `data/CartOrderSubmit.kt` (create call shared
   with the review screen), `ui/home/CartCheckoutScreen.kt` (calls it), `ui/home/v2/CartV2Screen.kt` (sheets),
   `ui/navigation/AnyRentNavHost.kt` (new routes), strings `values` / `values-vi`.
4. Skill `mobile-parity`; `i18n-keys` for the app strings.

## Verification

- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`
- iOS: `xcodebuild test … POS ADBDTests` on a spare simulator.

## Risks

- The create request must stay identical: Android shares one function with the review screen; iOS calls the same
  `OrderService.createOrder` the review screen's view model calls.

## Rollback

Revert the PR; the review screen path is still there for edited orders.
