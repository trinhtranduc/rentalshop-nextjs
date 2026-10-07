# Spec — Hide the "paid in full" pay line on mobile order rows

Issue: #458 · Status: accepted · Intent: ./intent.md

## Behavior

1. `payLine(amountDue: 0, refundDue: 0)` returns no line (nil / null) on iOS and Android.
2. `payLine` with `refundDue > 0` returns a refund line (refund wins over amount due); with only `amountDue > 0`
   it returns a due line. Unchanged.
3. `listPayLine` of a fully paid order (e.g. RETURNED, both balances 0) returns no line.
4. `listPayLine` stays nil for a cancelled order and for an older API that sends neither balance. Unchanged.
5. A row with no pay line shows only the total in the money column; the pay label is hidden (iOS stack view
   collapses it; Android does not compose the text), so no empty gap.
6. The "paid" case and the now-unused strings `orders.v2.pay.paid` (iOS en/vi) and `orders_v2_pay_paid`
   (Android en/vi) are removed.
7. With the new orders UI on, every list of the iOS `OverviewRankingOrdersViewController` (orders by product, orders
   by customer incl. Customer → View orders, new orders and other snapshot lists, rented out / collateral held, late
   returns) renders `OrderRowCell` rows in the search context (status tag, "Bán · …" on a sale, short "#0001",
   date line, late pill, total + pay line per rules 1–5). Header card ("N đơn hàng · total"), paging and tap → order
   detail are unchanged. Money is hidden for staff the same way as on the Orders tab.
8. Android: the same lists (`analytics-orders/{product|customer}` and `overview-orders/{kind}` routes, both on
   `OrdersScreen` in filtered mode) render the Orders tab `BoardRow` (search context) instead of `OrderListCard`
   when `NEW_ORDERS` is on. Loading, sorting, search box and tap → detail are unchanged.
9. `OrdersHomeLogic.orderRows(orders, now, zone)` turns a page of orders into order rows with late days, keeping
   the API order (shared by the Orders tab and the drill-down lists on both platforms).

## Out of scope

- Order detail money rows. Calendar and customer screens: they do not render this pay line today.
- Android has no header card on the drill-down lists today; adding one is not part of this change.
- Any API change.

## API and data

None.

## Acceptance

- [x] Each behavior line has a test, a command, or a UI check named in `plan.md`
- [x] iOS and Android called out (UI rule only, no API shape change)
- [x] No new user-facing strings (two removed)
- [x] Cancelled orders keep no pay line
