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

## Out of scope

Payment-method breakdown, inline status actions, tomorrow prep, stock, staff ranking, mobile.

## Acceptance

- [ ] 1 and 4 in `tests/api/outlet-operations-day.test.ts`
- [ ] 2–5, 7 where clauses in `tests/packages/database/outlet-operations.test.ts`
- [ ] 8 in `tests/api/outlet-operations-route.test.ts`
- [ ] 9 on localhost as merchant, outlet admin, staff (screenshots)
