# Spec — Tổng quan redesign

Issue: #604 · Status: approved · Intent: ./intent.md

## Behavior

1. Header: title, VN day (range label), period tabs and the shared range picker behave as before (same URL).
2. With revenue access, four tiles render as `<button>`s in this order: Giá trị đơn mới, Thực thu, Còn phải thu,
   Thế chân. Each shows label, value (`useFormatCurrency`), one chip, and a sparkline only when a per-day series
   for that measure exists (Thực thu → `series[].collected`). No hint lines.
3. Chips: growth `▲ n%` / `▼ n%` / `Mới` (from `growth.orderValue` / `growth.collected`, same rule as before);
   Còn phải thu → `N đơn quá ngày` when overdue pickups > 0, else `N đơn chờ lấy`; Thế chân → `đang giữ N đơn`
   from `cash.depositsHeld.orders` when present. No chip when there is nothing to say.
4. Thế chân value = collateral received − returned in the period, signed (`+`/`−`).
5. Clicking a tile sets `?detail=<orderValue|collected|outstanding|collateral>` (push); the drawer opens from that
   param, so back, refresh and links work. Unknown values and users without revenue access get no drawer.
6. Drawer: right side, 440 px, bottom sheet under 640 px; `role="dialog"` `aria-modal`, focus moves in, Tab is
   trapped, Esc / backdrop / close button remove `detail` from the URL and return focus to the tile.
7. Drawer bodies: Thực thu → waterfall rows (Cọc khi tạo đơn, Thu khi giao/bán, Phí hư hỏng/trễ hạn, −Hoàn tiền
   đơn huỷ, = Thực thu) from `buildMoney().collected`; Còn phải thu → one stacked bar (sẽ thu khi lấy đồ vs quá
   ngày lấy, 2 px gap) + legend rows with counts; Thế chân → Đã nhận / Đã trả lại bars + hatched Sẽ nhận khi giao /
   Đang giữ sẽ trả lại bars with order counts; Giá trị đơn mới → count of new orders + value. Each bar/segment has a
   hover tooltip (`title`); the rows carry the numbers as text. Each drawer ends with a link to the orders list.
8. Row 2: "Thực thu theo ngày" bar chart with the Thực thu | Số đơn toggle (today emphasised, tooltips) and
   "Hôm nay" 2×2 counters (Cần giao done/total, Cần nhận trả done/total, Trễ hạn trả, Quá ngày lấy) linking to the
   same order lists as before + "Ngày mai · Giao n · Trả n".
9. Row 3: "Đơn cần làm hôm nay" (≤ 5 rows: initials, name, #number, tag, amount; Xem tất cả) and
   "Thuê nhiều nhất" (top 5 horizontal bars by rental count, value in tooltip).
10. OUTLET_STAFF: no tiles, drawer, chart or top products (as before); Hôm nay and the order list stay.
11. Light and dark tokens; 390 px has no horizontal page scroll.
