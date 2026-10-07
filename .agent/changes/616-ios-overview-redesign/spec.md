# Spec — #616 (iOS)

## Periods
Chips: Hôm nay (today), 7 ngày (today−6 … today), Tháng này (1st … last day of the month, like web),
Tuỳ chọn (date-range picker, up to today + 365 days). Without the revenue permission there are no chips.

## Requests
- KPI report: `GET /api/analytics/period` for the period (`groupBy` day ≤ 45 days, else month).
- Chart report: the chart range when it differs from the period (Hôm nay: today−6 … today+7, 14 bars as web #610 and the canvas; a one-day custom
  range: day−6 … day). Otherwise the KPI report is reused.
- `GET /api/analytics/outlet-operations` (operations permission).

## KPI tiles (2×2)
| Tile | Value | Chip |
|---|---|---|
| Giá trị đơn mới | `revenue.totalOrderValue` | growth (`growth.orderValue.growth`): ▲/▼ N% (rounded), "Mới" ≥ 1000%, none at 0/null |
| Thực thu | `revenue.collected` | growth (`growth.collected.growth`) |
| Còn phải thu | `revenue.outstanding` | "N đơn quá ngày" (warn) if overduePickup.orders > 0, else "N đơn chờ lấy" (info) if atPickup.orders > 0 |
| Thế chân | `collateralFlow.received − returned`, "+" when positive | "đang giữ N đơn" (`cash.depositsHeld.orders` > 0) |

Values compact: < 1 000 000 full (`450.000`), else "18,65 tr" / "1,2 tỷ" (en "18.65M" / "1.2B"), two decimals
max, trailing zeros dropped. Missing value → "—".

Thực thu forecast: Σ `expectedCollected` of the period's series points with day key ≥ shop today. Shown when > 0:
bar collected share = max(0, collected) / (max(0, collected) + forecast); text "dự kiến thêm X hôm nay" when the
last forecast day is today, else "dự kiến thêm X đến DD/MM".

## Detail sheet (tap a tile)
Header "<tile> · <period label>", full value, close (44×44). Bodies:
- Thực thu: waterfall rows Cọc khi tạo đơn, Thu khi giao/bán, Phí hư hỏng/trễ, Hoàn đơn huỷ (red), Thực thu (total).
- Còn phải thu: stacked bar atPickup (blue) / overduePickup (amber) + two rows with order counts.
- Thế chân: Đã nhận (green), Đã trả lại khách (violet), Sẽ nhận khi giao (green hatched), Đang giữ, sẽ trả lại
  (violet hatched); widths relative to the largest; note on hatching.
- Giá trị đơn mới: Đơn mới · N đơn; with `orderValueByType` a rent/sale stacked bar + rows.

Link "Xem các đơn liên quan →": orders created in the period (Giá trị đơn mới, Thực thu), "Chưa lấy đồ"
(Còn phải thu), rented-out list (Thế chân).

## Chart "Thực thu theo ngày"
One bar per day of the chart range (months for > 45 days); solid `collected`, hatched `expectedCollected` on top;
heights against the tallest (value + forecast). Dashed marker + "Hôm nay" over today when in range. Axis labels:
first, today (bold), last. Tap a bar → callout: day ("T3 07/10"), Thực thu, Dự kiến (when > 0), Tổng.

## Hôm nay
2×2: Cần giao (done/total), Cần nhận trả (done/total), Trễ hạn trả (red when > 0), Quá ngày lấy (amber when > 0).
Line "Ngày mai · Giao n · Trả n" when the API sends `tomorrow`. Taps: Orders tab, Orders tab, late rented-out
list, Chưa lấy đồ.

## Colours
Light blue #2563EB, amber #D97706, green #059669, violet #7C3AED, red #DC2626; dark blue #3B82F6, violet #8B5CF6,
red #EF4444. Page/surface/line/ink tokens of the canvas in both modes.
