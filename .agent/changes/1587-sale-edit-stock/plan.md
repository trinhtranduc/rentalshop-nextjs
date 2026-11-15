# Plan — Editing a completed sale moves stock

Issue: #1587 · Status: in-progress · Spec: ./spec.md

## Steps

1. Failing test `tests/packages/database/order-update-sale-stock.test.ts` (real `updateOrder` and
   `updateOutletStockForOrder` on an in-memory OutletStock / Product store), committed alone (`bug-fix-tdd`).
2. `packages/database/src/product.ts`: `adjustOutletStockForEditedSaleItems(outletId, oldItems, newItems)` moves
   `stock` by the line difference, sets `available`, syncs `Product.totalStock`; the delta helper is shared with #504.
3. `packages/database/src/order.ts` `updateOrder`: the #504 block runs for the status that holds stock of each type
   (RENT `PICKUPED`, SALE `COMPLETED`) and picks the matching helper.
4. `packages/database/src/index.ts`: export the new helper.
5. `api-compat-review`: table in the PR, row in `.agent/api-changes/LOG.md`.

## Verify

- `yarn --cwd tests test order-update-sale-stock` (fails before step 2, passes after)
- `TZ=UTC yarn --cwd tests test`: same failing suites as `dev` apart from the new test
- `npx tsc --noEmit -p packages/database/tsconfig.json`: no new error
- Local API: sell, edit, cancel on one order; stock back to the starting number

## Files

- `packages/database/src/order.ts` — edit of a completed sale moves stock
- `packages/database/src/product.ts` — new helper, shared delta
- `packages/database/src/index.ts` — export
- `tests/packages/database/order-update-sale-stock.test.ts` — reproduction

## Risks

- Edits now move stock where they did not: shops see the expected numbers from now on; numbers already off stay off.
- Installed apps send the same request and read the same response.

## Rollback

Revert the PR; no migration.
