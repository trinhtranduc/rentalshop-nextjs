# Plan — Hide the "paid in full" pay line on mobile order rows

Issue: #458 · Status: accepted · Spec: ./spec.md

## Steps

1. Tests first, committed failing:
   - iOS `POS ADBDTests/OrdersHomeTests.swift` (`payLine(0, 0)` → nil) and `Phase8Tests.swift`
     (`listPayLine` of a RETURNED zero-balance order → nil).
   - Android `OrdersHomeTest.kt` (`payLine(0.0, 0.0)` → null) and `Phase8LogicTest.kt` (`listPayLine` → null).
2. iOS: `ViewModels/OrdersHomeViewModel.swift` — drop `PayLine.paid`, `payLine` returns `PayLine?`.
   `Viewcontrollers/Orders/OrderRowCell.swift` — both binders hide the pay label on nil.
3. Android: `ui/orders/v2/OrdersBoardLogic.kt` — drop `PayLine.Paid`, `payLine` returns `PayLine?`.
   `ui/orders/v2/OrdersHomeScreen.kt` — `WorkRow` / `OrderRow` pass `pay = null`.
4. Overview drill-down (owner follow-up): iOS `Viewcontrollers/Chart/OverviewRankingOrdersViewController.swift`
   registers `OrderRowCell` and binds `OrdersHomeLogic.orderRows` rows in `.search` context when `newOrders` is on.
   Android `ui/orders/OrdersScreens.kt` (filtered mode) renders a new internal `OrderBoardRow` from
   `ui/orders/v2/OrdersHomeScreen.kt` when `NEW_ORDERS` is on. Tests: `orderRows` on both platforms and an iOS
   `OrderRowCell` test (paid → total only).
5. Remove the unused strings (iOS en/vi `orders.v2.pay.paid`, Android en/vi `orders_v2_pay_paid`).
6. Skill: `mobile-parity` (both apps, same rule).

## Verification

- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`
- iOS: `xcodebuild … -scheme Development build`, then `POS ADBDTests` on a spare simulator.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrdersHomeViewModel.swift`, `Viewcontrollers/Orders/OrderRowCell.swift`,
  `en.lproj` / `vi-VN.lproj/Localizable.strings`, tests.
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/orders/v2/OrdersBoardLogic.kt`, `OrdersHomeScreen.kt`,
  `res/values{,-vi}/strings.xml`, `ui/orders/OrdersScreens.kt`, tests.
- `apps/mobile/POS ADBD/Viewcontrollers/Chart/OverviewRankingOrdersViewController.swift`.

## Risks

- None for the API or installed clients; display-only.

## Rollback

Revert the PR.
