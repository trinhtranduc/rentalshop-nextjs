# Plan — Cart "+ Add" goes to the product list

Issue: #433 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests (`bug-fix-tdd`): Android `ui/navigation/CartAddItemsTest.kt`, iOS case in
   `POS ADBDTests/ProductsV2Tests.swift`. Commit alone.
2. Android: `CartAddItems.popTarget(backStack)` in `ui/navigation/CartAddItems.kt`; `MainTabRouter`
   keeps a pending tab (`StateFlow`) consumed by Main; `CartV2Screen` gets `onAddItems`; NavHost wires it.
3. iOS: `CartV2Logic.addMoreRoute(previousIsProductsHome:)`; `CartV2ViewController` "+ Add" uses it.
4. Verify: Android `:app:testDebugUnitTest :app:assembleDebug`; iOS build (+ unit tests if a simulator runs).

## Files

- `apps/mobile-android/.../ui/navigation/CartAddItems.kt` — new, decision for the pop target
- `apps/mobile-android/.../ui/navigation/MainTabRouter.kt` — pending tab survives while Main is covered
- `apps/mobile-android/.../ui/navigation/AnyRentNavHost.kt` — wire `onAddItems`, collect pending tab
- `apps/mobile-android/.../ui/home/v2/CartV2Screen.kt` — `onAddItems` callback
- `apps/mobile/POS ADBD/Model/ProductsV2.swift`, `Viewcontrollers/Products/v2/CartV2ViewController.swift`

## Risks

- Tab switching after "create order" now goes through the pending tab; same result when Main is alive.

## Rollback

Revert the PR; behavior returns to "+ Add" = back.
