# Spec — #359

Issue: #359 · Status: accepted · Intent: ./intent.md

## Behavior

1. `PUT /api/products/:id` with `outletStock: [{outletId, stock}]` upserts each listed outlet by
   `(productId, outletId)`: `stock` as sent, `available = stock − renting`, `renting` unchanged.
2. An outlet with no row gets one with `renting: 0`, `available: stock`.
3. Rows of outlets not in the payload are not touched.
4. `stock < renting` for any listed outlet → 400 `STOCK_BELOW_RENTED`, nothing written.
5. `updateOrder` with `orderItems` sets `productName`, `productBarcode`, `productImages` on each new item from the product.
6. If the product cannot be loaded, the item keeps the snapshot of the old item with the same `productId`.

## Out of scope

Order edit rules, product delete, note images, any response field change.

## Acceptance

- [x] `tests/api/product-update-keeps-renting.test.ts` (1–4)
- [x] `tests/packages/database/order-update-keeps-item-snapshot.test.ts` (5–6)
- [ ] Installed iOS/Android/web edit a product and an order without errors (manual)
