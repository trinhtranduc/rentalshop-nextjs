# Editing a completed sale moves stock

Issue: #1587 · Author: agent · Status: in-progress · Created: 2026-11-15

## Problem

Khách báo "bán nhưng kho vẫn không giảm". Creating a sale takes stock, but editing the lines of a completed sale
(web, iOS and Android all offer Sửa on a `COMPLETED` sale) moves nothing, and cancelling it afterwards gives back
the edited lines, so stock ends higher than before the sale.

## Proposed outcome

After `PUT /api/orders/{id}` with new `orderItems` (or `outletId`) on a `COMPLETED` SALE, `OutletStock.stock`
equals what it would be had the sale been created with the saved lines at the saved outlet. A later cancel brings
stock back to the number before the sale.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` who edit sales; `packages/database` (`updateOrder`), used by every
`PUT /api/orders…` route. Web, iOS and Android need no change.

## Constraints

- Response shape and status codes unchanged (installed apps).
- Same rules as the sale itself (`updateOutletStockForOrder`): a missing stock row is created, stock may go below 0.

## Open questions

- Stock already off for shops that edited completed sales before this fix: left as is (shop corrects by hand) unless
  the owner asks for a correction script.

## Decision log

- 2026-11-15: owner: "làm giúp tôi" (fix and open the PR). No data correction in this change.
