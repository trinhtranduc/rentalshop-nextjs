# Spec — Overview "Hôm nay": orders created today

Issue: #1059 · Status: approved · Intent: ./intent.md

## Behavior

1. `showsTopCards(range, today)` is false when the range is exactly today (start == end == today), true otherwise.
   `showsTodayOrders` is its opposite. Hôm nay and a Tuỳ chọn of today: no Top cards, the new card. 7 ngày, Tháng
   này, any other Tuỳ chọn: the Top cards as before, no new card.
2. The card shows only to roles with `showsRevenue` and only when the report did not fail.
3. Title "Đơn tạo hôm nay" with a blue "Xem tất cả" on the right.
4. Summary "N đơn · Tổng giá trị" with the total bold on the right. N = `orderValueByType.rent.orders + sale.orders`,
   total = `totalOrderValue` (the tile's value and its "N đơn mới" chip; cancelled orders left out). The total is
   formatted as the tile (`compact`).
5. Rows: `income/orders status=new` of today, cancelled orders left out, one row per order, newest `createdAt` first,
   five at most. A row: customer (bold), "#orderNumber · HH:mm · Thuê|Bán" (grey, time in Asia/Ho_Chi_Minh, a "↗"
   icon before Thuê), the order total on the right (bold, `compact`).
6. A row opens the order detail. "Xem tất cả" opens the "Giá trị đơn mới" related list for today.
7. No orders: "Chưa có đơn nào hôm nay" (grey). Loading: the title and a spinner, as the Top cards.
8. Requests carry `timeZone` (shop zone) and `outletIds` of the branch chosen on Home (#828).

## Out of scope

- No API change; no change to the related list itself.
- No change to the tiles, chart or "Hôm nay" counters.

## API and data

Reads `GET /api/analytics/income/orders?startDate=&endDate=&status=new&plan=false&limit=200&offset=&timeZone=&outletIds=`
(existing; `withPermissions(['analytics.view.revenue', 'analytics.view.revenue.daily'])`, merchant/outlet scoped).
Fields used: `id` (numeric), `orderNumber`, `orderType`, `status`, `customerName`, `createdAt`, `totalAmount`.

## Acceptance

- [x] Each behavior line has a test or a UI check in `plan.md`
- [x] iOS and Android both changed (mobile parity)
- [x] New strings: iOS en + vi, Android `values` + `values-vi` (mobile only, no web locales)
- [x] Cancelled orders left out, Vietnam civil day, revenue roles only
