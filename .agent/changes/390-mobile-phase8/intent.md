# Mobile phase 8 — balances on rows, nearest-task sort, planned ranges, delete product, extend rental

Issue: #390 · Part of #385 · Needs #389 (PR #416, merged) · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The API now sends what the boards VL-tat-ca, VL-tim, Loc and Lich need (#389), but the apps do not use it yet:

- "Tất cả đơn" and search rows show only the total; the counter cannot see what is still to collect or to give back.
- The filter sheet has no "Việc gần nhất" sort, and its date range filters the actual hand-over / return dates, not
  the planned ones the counter thinks in.
- Calendar day rows show the total only, not "còn thu" or the late fee.
- A product cannot be deleted from the redesigned product detail.
- A rental cannot be extended from the order detail; the counter has to edit the whole order in the cart.

## Proposed outcome

- List and search rows: "còn thu X" (`amountDue` > 0), "trả cọc X" (`refundDue` > 0) or "✓ đã thu đủ"; nothing when
  the fields are missing (older API) or the order is cancelled.
- Filter sheet: sort "Việc gần nhất" (`sortBy=nearestTask`) and the date range on planned days
  (`dateField=pickupPlanAt|returnPlanAt`).
- Calendar rows: "trễ N ngày · phí X", "còn thu X" or "trả cọc X" from by-date `lateFee` / `amountDue` / `refundDue`.
- Product detail: "Xóa" with a confirm sheet for roles with `products.manage` (not `OUTLET_STAFF`); 409
  `PRODUCT_HAS_OPEN_ORDERS` shows the readable message.
- Order detail (RENT, RESERVED or PICKUPED): "Gia hạn" picks a later return day, checks the extra days with the batch
  availability call, then `PUT /api/orders/{id}` with `returnPlanAt`.
- Everything stays behind `newOrders`, `newOrderDetail`, `newProducts`, `newCalendar`; old screens untouched.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. No API change; endpoints used:
`GET /api/orders`, `GET /api/calendar/orders/by-date`, `DELETE /api/products/{id}`,
`POST /api/products/batch-availability`, `PUT /api/orders/{id}`.

## Constraints

- Flags off: old screens unchanged. New JSON fields are optional (installed apps and older servers).
- Days are device-zone `YYYY-MM-DD` keys; a return day ends at the last second of that day (same as the cart and
  Android `OrderPlanDays`); a same-day rental still occupies the day.
- Money without a currency symbol (`MoneyFormatter.format` / `formatMoneyVnd`); icons via DS tokens.
- No board for Xóa and Gia hạn on the canvas: use the existing sheet / menu patterns, keep it lean.

## Open questions

- None blocking. The API does not recompute the price of DAILY items when only `returnPlanAt` changes (see spec,
  out of scope).

## Decision log

- 2026-10-04 — Issue #390 under the round 2 plan #385; API contract from PR #416 (Trinh Tran)
- 2026-10-04 — "Gia hạn" is gated on `orders.update` (OUTLET_STAFF has it; the API checks outlet scope), Xóa on
  `products.manage` (the DELETE route's permission) (agent)
- 2026-10-04 — Manual check found that iOS dropped every batch-availability answer with a conflict: `ConflictInfo`
  decoded `conflictHours` / `conflictDuration` as Int while the API sends fractions (26.57). They are Double now
  (also fixes the CartV2 availability badge); unit test added (agent)
- 2026-10-04 — Open: `PUT /api/orders/{id}` with only `returnPlanAt` keeps `totalAmount` and `rentalDuration`, so
  DAILY items are not repriced and the iOS detail "N ngày" (from `rentalDuration`) stays the old count (agent)
