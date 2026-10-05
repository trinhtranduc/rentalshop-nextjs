# Plan — Hide the call button on late rows of "Việc cần làm"

Issue: #468 · Status: accepted · Spec: ./spec.md

## Steps

1. Tests first: extract today's rule ("phone only on late rows") into `workCallPhone` on both platforms and add
   tests that expect no phone for a late row (they fail).
   - iOS `POS ADBDTests/OrdersHomeTests.swift` (logic + `OrderRowCell` late work row).
   - Android `app/src/test/.../ui/orders/OrdersHomeTest.kt`.
2. Change `workCallPhone` to return no phone; update the board comments.
   - iOS `ViewModels/OrdersHomeViewModel.swift`, `Viewcontrollers/Orders/OrderRowCell.swift`.
   - Android `ui/orders/v2/OrdersBoardLogic.kt`, `ui/orders/v2/OrdersHomeScreen.kt`.
3. Row typography (owner follow-up): iOS `Viewcontrollers/Orders/OrderRowCell.swift` (`RowTagLabel` styles),
   `Utils/DesignTokens.swift` (`Radius.tag`), `Viewcontrollers/Products/v2/ProductsHomeViewController.swift`
   (stock label regular). Android `ui/orders/v2/OrdersHomeScreen.kt` (`RowTagStyle`), `ui/theme/Tokens.kt`
   (`Radius.tag`), `ui/home/v2/ProductsHomeScreen.kt` (stock label regular). Pay line regular in `OrderRowCell` (iOS) and `BoardRow` via `RowMoneyText` (Android).
   Tests on both.
4. Skill: `mobile-parity` (same rule in both apps). Strings stay: `Call customer` / `call_customer` are still used
   (iOS cell accessibility label, Android order detail).

## Verification

- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`
- iOS: `xcodebuild … -scheme Development build`, then `POS ADBDTests` on a spare simulator.

## Risks

- None for the API or installed clients; display-only.

## Rollback

Revert the PR.
