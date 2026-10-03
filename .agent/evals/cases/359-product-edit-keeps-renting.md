# products / orders: an edit rewrites rows and loses state it did not mean to change

Status: active · Added: 2026-10-03 · Source: #359

## Failure

- `PUT /api/products/:id` rebuilt OutletStock with `deleteMany` + `create` and `renting: 0`. After any product
  edit, rented units looked free (double booking) and outlets missing from the payload lost their stock rows.
- `updateOrder` re-created order items without `productName`, `productBarcode`, `productImages`, so edited orders
  lost the snapshot that keeps item names after a product changes or is deleted.

## Detect

```bash
cd tests && yarn test api/product-update-keeps-renting packages/database/order-update-keeps-item-snapshot
```

## Pass

- Product edit upserts per outlet: `renting` unchanged, `available = stock − renting`, other outlets untouched,
  `stock < renting` → 400 `STOCK_BELOW_RENTED`.
- Re-created order items carry the product snapshot, or the old item's snapshot when the product cannot be loaded.

## Notes

A nested `deleteMany` + `create` replaces state the request never sent. Prefer per-row `upsert`, and copy the
fields create sets (snapshots, counters) when a write re-creates rows.
