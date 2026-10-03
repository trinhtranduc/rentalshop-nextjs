# orders: a status write without a transition rule or a scope check

Status: active · Added: 2026-10-03 · Source: #361

## Failure

- `PATCH /api/orders/:id/status` and `PUT /api/orders/:id` wrote any status from any status (RETURNED → RESERVED,
  SALE COMPLETED → PICKUPED).
- `PATCH /api/orders/:id/status` had no merchant/outlet check: any user with `orders.update` could change another
  merchant's order by id. `PUT` skipped the merchant check when a MERCHANT sent the order's own `outletId`.
- `analytics/period` top products counted CANCELLED orders.

## Detect

```bash
cd tests && yarn test packages/constants/order-status-transitions api/order-status-route api/order-put-status packages/analytics/top-products-cancelled
```

## Pass

Only the transitions in `ORDER_STATUS_TRANSITIONS` (`packages/constants/src/status.ts`) are written; others get 400
`INVALID_ORDER_STATUS`. Orders outside the caller's merchant/outlet get 403 on both routes. Top products exclude CANCELLED.

## Notes

Every route that loads an order by id checks scope before it writes. iOS and Android change status through `PUT`,
web through `PATCH`: a rule added to one route goes into both.
