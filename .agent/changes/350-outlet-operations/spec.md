# Spec — Outlet operations panel

Issue: #350 · Status: accepted · Intent: ./intent.md

## Behavior

1. `today` = Vietnam civil day of the request time; at 16:59:59Z it is the UTC date, at 17:00:00Z the next date.
2. `pickupsToday`: RENT, RESERVED, `pickupPlanAt` within today, not deleted, in scope.
3. `returnsToday`: RENT, PICKUPED, `returnPlanAt` within today.
4. `overdueReturns`: RENT, PICKUPED, `returnPlanAt` before today's start; each row has `daysOverdue` (civil days, ≥ 1).
5. `noShows`: RENT, RESERVED, `pickupPlanAt` before today's start.
6. Each list returns `count` and up to 50 rows ordered by the relevant date, with numeric `id`, `orderNumber`,
   customer name and phone, plan dates, item count and product names, `isReadyToDeliver`.
7. `cash` (only with `analytics.view.revenue`): deposits held (sum of `depositAmount`, `securityDeposit`, count) over
   PICKUPED rentals; deposits due back today (same over `returnsToday`); fees today (sum of `lateFee`, `damageFee`
   on orders with `returnedAt` today). Staff get `cash: null`.
8. Scope: OUTLET_ADMIN / OUTLET_STAFF always their own outlet (a passed `outletIds` is ignored); MERCHANT its
   outlets, optionally narrowed by `outletIds` (others are rejected 403); ADMIN must pass `merchantId` or `outletIds`.
9. Web: panel above the stat cards with 4 tabs and counts; rows link to `/orders/{orderNumber}` and `tel:`; the
   cash card only for managers; empty states; vi/en strings.

10. `doneToday`: `pickups` = RENT orders in scope, not deleted, not CANCELLED, `pickedUpAt` within today;
    `returns` = same with `returnedAt` within today. Feeds the "Đã giao x/y", "Đã nhận trả x/y" bars.
11. `newOrdersByDay`: the 7 Vietnam civil days ending today, oldest first, `{ date, count }` of orders (any type,
    not deleted, in scope) created that day. Counts only, so staff get it too.
12. Web, Today view (review round 2, "too much text"): 3 KPIs, "Đơn mới" with a 7-day sparkline; the panel shows
    two progress bars, a 7h–22h strip of booked handover/return times with a "now" marker, filter chips with
    counts, and one line per order (urgency edge, status in words, customer, call button), most urgent first.
    Deposits are one number plus a bar of what goes back today. "Hoạt động gần đây" is removed.
13. Web, range KPIs: "Đơn hủy" is a count (the cancelled ÷ new ratio went past 100%); the revenue tile is labeled
    "Tiền thu ròng" (the `period` API returns net cash in, which can be negative) and shows no % when negative.
14. A11y: clickable KPI tiles do not nest the tooltip button (stretched button); `FieldTooltip` has a 24px target
    and opens on focus and tap.

## Out of scope

Gross revenue and the outlet filter in the `period` API, the month range timezone (separate issue).
Payment-method breakdown, inline status actions, tomorrow prep, stock, staff ranking, mobile.

## Acceptance

- [ ] 1 and 4 in `tests/api/outlet-operations-day.test.ts`
- [ ] 2–5, 7 where clauses in `tests/packages/database/outlet-operations.test.ts`
- [ ] 8 in `tests/api/outlet-operations-route.test.ts`
- [ ] 9 on localhost as merchant, outlet admin, staff (screenshots)
- [ ] 10, 11 in `tests/packages/database/outlet-operations.test.ts`; the 7-day window in `tests/api/outlet-operations-day.test.ts`
- [ ] 12–14 on localhost (screenshots, axe on the Today view: 0 violations)
