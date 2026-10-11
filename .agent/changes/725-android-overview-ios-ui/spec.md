# Spec — #725

Top to bottom, as iOS:

1. "Tổng quan" + the period's long range on the right; chips Hôm nay / 7 ngày / Tháng này / Tuỳ chọn (custom shows
   the short range; the picker allows a year ahead). Default chip: Hôm nay. Tháng này is the whole month.
2. 2×2 tiles: Giá trị đơn mới (growth chip, "N đơn mới"), Thực thu (`cashCollected`, growth chip, forecast bar +
   "dự kiến thêm X hôm nay / đến dd/MM"), Còn phải thu ("N đơn quá ngày" or "N đơn chờ lấy"), Thế chân
   (collateralFlow net, signed, "đang giữ N đơn"). Values compact ("6,39 tr"). Tap → sheet: caption
   "<tile> · <period>", full value, rule sentence, body (order value split, waterfall incl. "Thế chân nhận − trả",
   outstanding split, collateral rows with hatched upcoming), "Xem các đơn liên quan →" (route from #722).
3. Chart card "Thực thu theo ngày": solid collected, hatched expected, dashed "Hôm nay" marker, axis labels at
   first / today / last; Hôm nay charts 7 days before and after today. Money only (no Money/Orders toggle).
4. Hôm nay card only when the period is today: Cần giao d/t, Cần nhận trả d/t, Trễ hạn trả, Quá ngày lấy, and
   "Ngày mai · Giao a · Trả b" (`tomorrow` of outlet-operations).
5. Top sản phẩm / Top khách hàng cards (five rows, compact amount, bar, count) with "Xem tất cả".

Removed: hero, the two money tiles, the period dropdown sheet, Money/Orders chart, ĐƠN stat rows, VIỆC HÔM NAY band.

Logic in `domain/overview/OverviewDashLogic.kt` with JVM tests mirroring `OverviewDashLogicTests.swift`.
