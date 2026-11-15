# Spec — Editing a completed sale moves stock

Issue: #1587 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `PUT /api/orders/{id}` with `orderItems` on a SALE that is `COMPLETED` and stays `COMPLETED` (no status, or
   `COMPLETED` sent again): per product at the order's outlet, `stock` changes by (old lines − new lines),
   `available = max(0, stock − renting)`, and `Product.totalStock` is synced. A raised quantity or an added product
   takes units, a lowered quantity or a removed line gives them back.
2. Same lines as before: nothing moves.
3. A PUT that changes `outletId` of a completed sale: the old outlet gets the old lines back, the new outlet takes
   the saved lines.
4. Cancelling after an edit gives back exactly the units held, so stock returns to the number before the sale.
5. A missing stock row is created; stock may go below 0 (same as creating the sale).
6. #504 (PICKUPED RENT edits move `renting`) is unchanged; RESERVED orders move nothing.
7. Response and status codes unchanged.

## Out of scope

- Correcting stock already off from earlier edits.
- Old sales still `RESERVED` (they take stock when they move to `COMPLETED`, as today).

## API and data

No field added or changed. Business rule only, in `packages/database/src/order.ts` and `product.ts`.

## Acceptance

- [x] Behaviors 1–5 in `tests/packages/database/order-update-sale-stock.test.ts`
- [x] Behavior 6: `adjustOutletStockForEditedOrderItems` unchanged apart from the shared delta helper
- [x] iOS and Android: no change (same request, same response)
- [x] No user-facing strings
