# Plan — Mobile phase 7 gaps

Issue: #388 · Status: accepted · Spec: ./spec.md

## Steps

1. Pure logic + tests:
   - iOS `Model/ProductDetailV2Logic.swift` (strip, chips, row state), `LateText` (plural key),
     `OverviewLinks` (late filter); tests in `POS ADBDTests/Phase7GapsTests.swift`.
   - Android `domain/products/ProductDetailLogic.kt`, `domain/overview/OverviewLinks.kt`, `CartStore` deposit;
     tests `ProductDetailLogicTest.kt`, `OverviewLinksTest.kt`, `CartDepositTest.kt`, `LatePluralsTest.kt`.
2. iOS: `ProductDetailViewController` strip + chips + rows; `OverviewV2ViewController` taps →
   `OverviewRankingOrdersViewController` (new filter cases `.rentedOut`, `.lateReturns`); `SettingsV2` counts;
   `AppConfigService` cache policy; "Late %d days" call sites → `LateText`.
3. Android: `ProductDetailScreen` strip + chips + rows; `OverviewV2Screen` callbacks → `overview-orders` routes
   (new kinds `rented`, `late`, product with dates); `SettingsV2Screen` counts; `plurals`; `CartStore`; strings.
4. Strings: iOS `vi-VN` / `en`; Android `values` / `values-vi`.
5. Verify: unit tests + builds; local API on 3187; screenshots vs boards, merchant and staff.

## Risks

- `OrdersScreen` / `OverviewRankingOrdersViewController` are shared with old screens: new parameters default to
  the current behaviour.

## Rollback

Revert the PR, or switch `newProducts` / `newOverview` / `newSettings` off server-side.
