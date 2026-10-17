# Plan — Sort a product's order list by rental date

Issue: #1025 · Status: in-progress · Spec: ./spec.md

## Steps

1. iOS: `EntityOrdersLogic.productOrdersQuery(_:)` (sortBy / sortOrder of a `RentOrdersFilter`) and the default sort.
2. iOS: `OrderRowContext.sortedList(sortedBy:)` = `.list` plus the bold sorted date.
3. iOS: `OrdersFilterSheet(filter:showsRange:)`; `OverviewRankingOrdersViewController` sort row + sheet for `.product`.
4. Android: `EntityOrdersLogic` query helper; `OrderListRow(sortedBy)`; `FilterSheet(showsRange)`; sort row in
   `EntityOrdersScreen` for products.
5. Tests: iOS `OrdersHomeTests`; Android `EntityOrdersLogic` test.
6. Verify (`verify-change`): iOS build + tests, Android assemble + unit tests.

Skills: `mobile-parity` (both apps), `i18n-keys` (no new strings expected). No day logic (`timezone-dates` not needed).

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Chart/OverviewRankingOrdersViewController.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrdersFilterSheet.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrderRowCell.swift`
- `apps/mobile/POS ADBDTests/OrdersHomeTests.swift`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/orders/v2/EntityOrdersScreen.kt`, `OrdersHomeScreen.kt`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/orders/EntityOrdersLogic.kt` + tests

## Risks

- The overview top-product drill-down gets the same control (same screen mode).
- No API or payload change; installed apps unaffected.

## Rollback

Revert the PR; the list goes back to newest created first.
