# Plan — iOS Orders after an outlet change

Issue: #1525 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing test in `OrdersHomeTests.swift` (`bug-fix-tdd`), against `OrdersHomeViewModel.outletDidChange()`.
2. Fix: `outletDidChange()` marks every list dirty, drops `snapshots`, then `reload()`.
3. `OrdersViewController.outletChanged()` calls `viewModel.outletDidChange()`.
4. Verify: `xcodebuild test -only-testing:"POS ADBDTests/OrdersHomeTests"` (simulator).

## Files

- `apps/mobile/POS ADBD/ViewModels/OrdersHomeViewModel.swift` — `outletDidChange()`
- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrdersViewController.swift` — call it
- `apps/mobile/POS ADBDTests/OrdersHomeTests.swift` — tests

## Risks

iOS only, no API change.

## Rollback

Revert the PR.
