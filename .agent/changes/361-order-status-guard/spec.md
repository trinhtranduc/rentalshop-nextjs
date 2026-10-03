# Spec — #361

Issue: #361 · Status: accepted · Intent: ./intent.md

## Behavior

1. Allowed status changes: RENT `RESERVED→PICKUPED`, `PICKUPED→RETURNED`, `RESERVED→CANCELLED`,
   `PICKUPED→CANCELLED`; SALE `COMPLETED→CANCELLED`, `RESERVED→COMPLETED`. Same status → allowed (no-op).
2. Any other change via `PATCH /api/orders/:id/status` or `PUT /api/orders/:id` → 400 `INVALID_ORDER_STATUS`,
   order not written.
3. `PATCH /api/orders/:id/status` on an order outside the caller's outlet (OUTLET_ADMIN/STAFF) or merchant
   (other non-ADMIN roles) → 403, order not written.
4. `PUT /api/orders/:id` checks the merchant for every non-ADMIN user, also when `outletId` is the order's outlet.
5. `analytics/period` top products exclude CANCELLED orders.
6. `POST /api/orders` with `orderType: SALE` stores `depositAmount: 0`, `securityDeposit: 0`.

## Out of scope

`revert` / `restore` routes, order edit rules, loyalty, response shapes.

## Acceptance

- [ ] `tests/packages/constants/order-status-transitions.test.ts` (1)
- [ ] `tests/api/order-status-route.test.ts` (2, 3)
- [ ] `tests/api/order-put-status.test.ts` (2, 4, installed-app requests)
- [ ] `tests/packages/analytics/top-products-cancelled.test.ts` (5)
- [ ] `tests/api/order-deposits.test.ts` (6)
