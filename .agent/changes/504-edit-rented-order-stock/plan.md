# Plan — #504

1. `packages/database/src/product.ts`: `adjustOutletStockForEditedOrderItems(outletId, oldItems, newItems)` (per-product renting delta).
2. `packages/database/src/order.ts` `updateOrder`: call it for PICKUPED RENT edits; the status-change transition uses the old lines when leaving a stock-holding status, the saved lines/outlet when entering one.
3. `tests/e2e/business/order-edit.e2e.test.js`: BF-QTY-04 plain, BF-QTY-05..12; `tests/e2e/TEST_CASES.md`.
4. Verify: whole business e2e (both time zones); compat row in `.agent/api-changes/LOG.md`.
