# Plan — iOS product detail chips show a count but no order rows

Issue: #1037 · Status: approved · Spec: ./spec.md

## Steps

1. UI test `test7pProductDetailChipOrders` reproduces the blank chip (fails on dev).
2. `OrderRowCell.standalone()` pins `contentView` to the cell with Auto Layout; product and customer detail rows use it.
3. Unit test: a standalone cell in a vertical stack is taller than 0.
4. Verify: iOS build + unit tests, the UI flow on a simulator against a local seeded API.

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrderRowCell.swift` — `standalone()`
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductDetailViewController.swift` — use it
- `apps/mobile/POS ADBD/Viewcontrollers/Customer/v2/CustomerDetailV2ViewController.swift` — use it
- `apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift`, `apps/mobile/POS ADBDTests/OrdersHomeTests.swift` — tests

## Risks

- Table-view rows unchanged (they do not call `standalone()`).

## Rollback

Revert the PR.
