# Plan — One type scale for the new mobile UI

Issue: #424 · Status: accepted · Spec: ./spec.md

## Steps

1. Tokens + tests
   - iOS `apps/mobile/POS ADBD/Utils/DesignTokens.swift`: `DS.TextSize` (+ `DS.Gap` for line gaps and row
     padding); test `POS ADBDTests/TypeScaleTests.swift`.
   - Android `ui/theme/Tokens.kt`: `DS.TextSize` (sp) + `DS.Gap`; test `ui/common/TypeScaleTest.kt`.
2. Apply the mapping rule on every new-UI file, replacing literal sizes with tokens:
   - iOS: `Viewcontrollers/Orders/*` (OrdersViewController, OrderRowCell, OrdersFilterSheet),
     `Viewcontrollers/OrderDetail/*`, `Viewcontrollers/Products/v2/*`, `Viewcontrollers/Customer/v2/*`,
     `Viewcontrollers/Auth/v2/*`, `OnboardingV2ViewController`, `SettingsV2ViewController`,
     `OverviewV2ViewController`, `CalendarV2ViewController`.
   - Android: `ui/**/v2/*`, `ui/onboarding/OnboardingV2Screen.kt`, and new-UI-only helpers.
3. Spacing: order row padding 12 → 15 and line gap → 5; product row padding 10 → 14, min height 88 → 96.
4. Leave shared code (tab bar, `OverviewRankingOrdersViewController`, `AppComponents.kt` defaults used by
   old screens) unchanged.
5. Verify (`verify-change`, `mobile-parity` step 8): unit tests on both platforms, iOS `xcodebuild` and
   Android `:app:assembleDebug` when disk allows, screenshots of the new screens next to the boards.

## Files

- Tokens and tests on both platforms; the new-UI files above.

## Risks

- A bigger label clips in a fixed-height box (calendar cells, pills, cart bar). Check each fixed height.
- A shared helper used by old screens changes size. Only flag-gated files change.

## Rollback

Revert the commit; the screens are also behind server flags.
