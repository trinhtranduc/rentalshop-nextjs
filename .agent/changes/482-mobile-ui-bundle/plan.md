# Plan — Mobile UI bundle (#482)

Issue: #482 · Status: accepted · Spec: ./spec.md

## Steps (one commit per item per platform)

1. Branch `feat/482-mobile-ui-bundle` from `origin/fix/480-cart-note-photos` (PR #481), merge `origin/dev`.
2. Notifications wrap — iOS `Views/NotificationV2Cell.swift`; Android `ui/inbox/InboxV2Screen.kt`.
3. Created time — tests first (iOS `OrdersHomeTests`, `OrderDetailLogicTests`; Android `OrdersHomeTest`,
   `OrderDetailLogicTest`), then iOS `OrdersHomeViewModel.swift`, `OrderDetailLogic.swift`,
   `OrderDetailViewController.swift`; Android `OrdersBoardLogic.kt`, `OrderDetailLogic.kt`, `OrderDetailV2Screen.kt`.
4. Status names — tests first; iOS order detail header tag, strings; Android detail header tag, strings.
5. Orders by product/customer — logic + tests (`EntityOrdersStats`), iOS `OverviewRankingOrdersViewController.swift`;
   Android new `ui/orders/v2/EntityOrdersScreen.kt`, route `AnalyticsOrders` for product/customer.
6. Cart pricing sheet — logic + tests (`CartV2Logic.pricingChoices`, `pricePreview`, apply), iOS
   `CartPricingSheetViewController.swift` + `CartV2ViewController.swift`; Android `CartPricingSheet` + `CartStore.applyLinePricing`.
7. Change password sheet — iOS `ChangePasswordSheetViewController.swift`; Android `PasswordSheet` in `SettingsV2Screen.kt`.
8. Skill `mobile-parity`: both apps per item. No API change.

## Verification

- iOS: `xcodebuild … -scheme Development build`, then the touched `POS ADBDTests` on a simulator.
- Android: `./gradlew :app:assembleDebug :app:testDebugUnitTest`.

## Risks

- Product stats from loaded pages are partial until scrolled ("N+").
- Old orders show a 2-digit year; row lines get longer (they already wrap to 2 lines).

## Rollback

Revert the PR.
