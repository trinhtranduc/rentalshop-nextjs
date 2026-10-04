# Spec — API phase 8

Issue: #389 · Status: accepted · Intent: ./intent.md

## Behavior

### Orders list money (`GET /api/orders`)

1. Every row has numeric `amountDue` and `refundDue` from `computeOrderBalance` over the order's COMPLETED payments
   (SALE / PICKUP / RETURN_ADJUSTMENT notes). CANCELLED, RETURNED and COMPLETED rows are `0 / 0`.
2. Payments are read in one grouped query per page (`orderId`, `notes`, `SUM(amount)`, COMPLETED only), bounded by the
   page ids. No payment rows are returned to the client.

### Nearest-task sort (`sortBy=nearestTask`)

3. Order: open orders (RESERVED by `pickupPlanAt`, PICKUPED by `returnPlanAt`) ascending by that task instant, so late
   tasks (task day before the Vietnam "today") come first and the nearest upcoming task follows; open orders without a
   task date come after dated ones; then RETURNED / COMPLETED / CANCELLED by `createdAt` desc.
4. Pagination, `total` and every other filter (status, type, outlet, merchant scope, search, dates) work as with other
   sorts. `sortOrder` is ignored for this sort.
5. Cost: at most `page × limit` light rows (`id` + one date) per open status, plus three counts; full rows only for the page.

### Planned-date ranges

6. `dateField=pickupPlanAt|returnPlanAt` with `startDate` / `endDate` (`YYYY-MM-DD`, Vietnam days, or `timeZone`) keeps
   orders whose planned instant falls inside `[start of startDate, end of endDate]` in that zone. Orders with no planned
   date are excluded. Either bound alone is open-ended.
7. Without `dateField`, or with the old values, results are unchanged.

### Calendar by-date

8. Each row of `GET /api/calendar/orders/by-date` also has `amountDue`, `refundDue` (rule 1) and `lateFee` (stored fee, 0 when none).

### Product soft delete

9. `DELETE /api/products/{id}` sets `deletedAt = now()` and `isActive = false`; the row, images and order links stay.
   Response shape unchanged (`{ id, name, images }`, code `PRODUCT_DELETED_SUCCESS`).
10. If any non-deleted order with status RESERVED or PICKUPED has an item of this product → 409
    `PRODUCT_HAS_OPEN_ORDERS`, nothing changes.
11. Merchant scope: a product of another merchant → 403 `PRODUCT_ACCESS_DENIED` (unchanged); a deleted product → 404.
12. Deleted products are hidden from: `GET /api/products` (all `isActive` filters), product search / barcode lookup,
    image search, export, public tenant list, product detail / edit / availability / availability-calendar
    (404, like a hard-deleted product before), batch availability, and the plan-limit product count.
13. Orders that contain a deleted product still list and show its name, barcode and images (snapshot / relation).
14. `POST /api/products/batch-delete` soft-deletes the same way; a product with open orders is reported in `errors`
    with `PRODUCT_HAS_OPEN_ORDERS` and is not deleted.
15. Web product detail: on failure it shows the error and stays on the page; on success it toasts and goes to the list.

## Out of scope

- Restoring a soft-deleted product (the existing restore route only toggles `isActive`).
- Freeing the barcode of a deleted product.
- Mobile UI for delete / sort / ranges (#390). Only the error-code tables are touched here.
- Changing analytics (top products keep counting history of deleted products).

## API and data

- `GET /api/orders` rows: `+ amountDue: number`, `+ refundDue: number`. Query: `sortBy` gains `nearestTask`;
  `dateField` gains `pickupPlanAt`, `returnPlanAt`.
- `GET /api/calendar/orders/by-date` rows: `+ amountDue`, `+ refundDue`, `+ lateFee` (numbers).
- `DELETE /api/products/{id}`: new 409 `PRODUCT_HAS_OPEN_ORDERS`.
- Prisma: `Product.deletedAt DateTime?` (new migration, nullable, no backfill).
- Scope: unchanged (`userScope` merchant / outlet). IDs stay numeric.

## Acceptance

- [x] Each behavior line has a test, a command, or a UI check named in `plan.md`
- [x] iOS and Android called out (error code tables; consumers in #390)
- [x] New user-facing strings listed for all five locales (`PRODUCT_HAS_OPEN_ORDERS`)
- [x] Cancelled orders, Vietnam civil days, and role limits still hold where they apply
