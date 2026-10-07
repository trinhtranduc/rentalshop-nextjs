# Spec — Lịch trống

Status: accepted · Mockups: ./mockups/ (iOS reference; Android matches)

## Product detail
1. The day strip shows 6 day tiles (today first) + a 7th tile of the same size: calendar icon, white, 1.5 px accent
   border (`#1D4ED8`), accessibility label "Lịch trống". Tapping it opens the month screen.
2. The bottom bar keeps only "Thêm vào giỏ" (full width). The "Lịch trống" button is removed. The caption stays
   "Số còn trống mỗi ngày · cửa hàng có N <unit>" (no extra hint).

## Month screen (new, replaces the old screen from product detail)
3. Header ‹ "Lịch trống"; product row: photo (or placeholder), name, "<code> · Tổng N cái" (stock of the outlet).
4. Month title "Tháng 10, 2026" with ‹ › (previous month disabled before the current month); weekday row T2…CN;
   grid with Vietnam civil days (Mon first). Data: `GET /api/products/{id}/availability-calendar?from&to` for the
   visible month (`days[].available`, `stock`), same call the detail strip already makes, per month.
5. Day cell: number + "còn N" / "hết". Colours: available == stock → green (`#ECFDF5`/`#065F46`); 0 < available <
   stock → orange (`#FFF7ED`/`#7C2D12`); 0 → red (`#FEE2E2`/`#7F1D1D`); past days grey, no count; today has a 2 px
   ink ring. Legend: Còn đủ · Còn ít · Hết · Ngày chọn.
6. Range: first tap = start, second tap ≥ start = end (tap before start restarts); start/end solid accent, days in
   between light blue; past days cannot be picked. Summary line "T4 07/10 → T6 16/10 · N ngày · còn ít nhất M cái"
   (M = min available in the range; "hết" in red when 0).
7. Orders of the tapped day: "T5 08/10 · K ĐƠN ĐANG GIỮ ĐỒ" + rows (customer, #number, "Giao … · trả …",
   quantity of this product); data from the product's orders list the detail already loads (`GET /api/orders?productId=`,
   RESERVED/PICKUPED), filtered to orders whose rental days cover that day (inclusive, Vietnam days). A row opens the
   order detail. None → "Không có đơn nào giữ đồ ngày này".
8. Bottom: "Thêm vào giỏ với ngày này" adds the product to the cart with the chosen range as the cart's pickup /
   return days (same path as the detail's add + date pick), then returns; disabled until a range is chosen or when
   M == 0 (unless the shop allows overlapping orders, then enabled with the orange note).
9. Staff: same screen (read + add to cart); no money shown here.

Out of scope: web; the old screens stay for any other entry point that still opens them.

Tests: pure model per platform (cell state per available/stock/past/today, range rules, min available, orders
covering a day, month grid offset — 1 Oct 2026 is a Thursday), plus builds; screenshots on simulator/emulator.
