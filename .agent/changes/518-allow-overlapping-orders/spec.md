# Spec — allowOverlappingOrders

Issue: #518 · Status: in progress · Intent: ./intent.md

## Behavior

1. `Merchant.allowOverlappingOrders` exists, `NOT NULL DEFAULT true`; existing shops read `true`.
2. Setting ON (or missing): POST/PUT order routes behave exactly as before and run no conflict queries.
3. Setting OFF, `POST /api/orders` RENT with pickup and return dates: for each product (quantities of
   the same product summed), for each VN civil day from pickup day to return day inclusive,
   `booked(day) + requested > OutletStock.stock` → `409 ORDER_SCHEDULE_CONFLICT`, nothing inserted.
   `booked(day)` = quantity of that product in other RENT orders at the same outlet, status
   RESERVED/PICKUPED, `deletedAt` null, whose pickup..return VN days cover that day. Peak per day, not
   a sum over the range.
4. A retried create (#341 replay) still returns the existing order, never 409.
5. Setting OFF, `PUT /api/orders/[orderId]` and legacy `PUT /api/orders?id=` on a RENT order that is
   (or becomes) RESERVED/PICKUPED: checked when dates, outlet or status-to-active change (all products),
   or when item quantities grow (those products). The order itself is excluded. Legacy PUT returns 409
   explicitly (its catch answers 500).
6. `POST /api/orders/[orderId]/revert` and `/restore` that leave a RENT order active are checked the
   same way. `PATCH /status` cannot reactivate a RENT order (`canChangeOrderStatus`), so it needs no check.
7. SALE orders are never checked.
8. 409 body: `{ success:false, code:'ORDER_SCHEDULE_CONFLICT', message, error, data:{ conflicts:[{ productId,
   productName, requested, available, days:['YYYY-MM-DD'], orderNumbers:['…'] }] } }`; `available` is the
   smallest free count on any day of the window. Numeric ids only.
9. `PUT /api/settings/merchant` accepts `allowOverlappingOrders` (boolean) from `MERCHANT`/`ADMIN`;
   any other role → 403 `INSUFFICIENT_PERMISSIONS`. A body with only `allowOverlappingOrders`
   (no `name`) updates just that field; old bodies behave as before. Non-boolean → 400.
10. `GET /api/users/profile` `merchant` object and the login payload `merchant` object carry
    `allowOverlappingOrders` (additive).

## Out of scope

iOS / Android UI (later PR), web UI toggle.

## API and data

Migration `20261006120000_merchant_allow_overlapping_orders`. New error code `ORDER_SCHEDULE_CONFLICT`
(409) in `errors.ts`, response-builder, `locales/*/errors.json`, `locales/vi/errors-mobile.json`.

## Acceptance

- [ ] Each behavior line has a test in `tests/api/schedule-conflict*.test.ts`
- [ ] iOS and Android called out (follow-up PR)
- [ ] Error string in en, vi, ja, ko, zh
- [ ] Cancelled orders, VN civil days, role limits hold
