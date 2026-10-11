# Spec — #722

1. Thực thu tile = `revenue.cashCollected` (older API: collected + collateral net, else collected), sub "Gồm thế chân". The sheet is titled Thực thu; its rows Tiền của tiệm + Thế chân add up to it.
2. "Xem các đơn liên quan" (new screen `overview-related/{kind}/{start}/{end}`):
   - Thực thu sheet → its events.
   - Thế chân row → its collateral events (row `collateral`, #721).
   - Còn phải thu rows → the period's owing orders.
   - Orders section "Đơn mới" → the created orders, cancelled ones at 0.
   The footer "Tổng các dòng · n: total" equals the figure. Rules as iOS `OverviewDashLogic.relatedRows`.
3. "Đơn mới" row = rent + sale orders (`orderValueByType`); an older API keeps `orderCounts.new` and its old list.
4. The "Chưa lấy đồ" row still opens every not-picked-up order.
