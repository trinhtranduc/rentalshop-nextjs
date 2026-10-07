# Spec — #605

Day D = civil day of the report's `timeZone` (default Vietnam): `[D-1 17:00Z, D 16:59:59.999Z]`.
Today = `formatDateKeyInTimeZone(now, timeZone)`.

## `series[].expectedCollected` (number, on every point when computed)
- Orders: `orderType = RENT`, `status = RESERVED`, `deletedAt = null`, in the route's outlet filter,
  `pickupPlanAt` in `[max(rangeStart, start of today), rangeEnd]`. No query when `rangeEnd < start of today`.
- Amount per order = what the hand-over will collect, without collateral (rule of `handOverMoney` /
  `apps/api/lib/order-balance.ts` minus the `securityDeposit` term):
  `max(0, totalAmount − depositAmount − Σ COMPLETED payments with notes = 'PICKUP')`.
- Bucketed on the civil day of `pickupPlanAt`. Past days are 0 (an overdue no-show is not expected money).
  CANCELLED / PICKUPED / RETURNED orders and sales are never included.
- Monthly series: sum per civil month.

## `series[].newOrderValue` (number)
Σ `totalAmount` of orders created on that civil day (month for monthly series), not CANCELLED, not deleted —
the rows `revenue.totalOrderValue` already loads (no extra query). Σ over the series = `totalOrderValue`.

## `revenue.orderValueByType`
`{ rent: { amount, orders }, sale: { amount, orders } }` from the same rows; `rent.amount + sale.amount =
totalOrderValue`. Present whenever `totalOrderValue` is.

## Failure isolation
Each new computation is isolated: if it throws, it is logged and its field is left out; every old field keeps
its value and the route still answers 200.

## Unchanged
`futureIncome`, `realIncome`, `collected`, `orderCount`, `newOrderCount`, every `revenue` / `growth` / `top*` field.
`GET /api/analytics/overview` reuses the monthly series, so its `income[]` gets the two series fields too (additive).
