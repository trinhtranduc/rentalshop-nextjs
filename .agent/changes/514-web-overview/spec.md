# Spec — #514 Shop web Tổng quan

Issue: #514 · Status: accepted · Intent: ./intent.md

## Behavior

1. **Header.** The page shows the title "Tổng quan" and the date range of the selected period, written as shop days ("CN 27/09 – T7 03/10").

2. **Period tabs.** The tabs are Hôm nay, 7 ngày qua, Tháng này and Tuỳ chọn.
   - Ranges are Vietnam civil-day keys:
     - today: today–today
     - 7 days: today−6 to today
     - month: the first to the last day of this month
     - custom: from–to, with the two swapped if they were entered in reverse order
   - The period is kept in `?period=` (plus `from`/`to` for custom).
   - Users without full analytics access only get Hôm nay.

3. **KPI cards.** There are four, from `/api/analytics/period`:
   - **Tổng giá trị đơn mới** = `revenue.totalOrderValue`. The hint shows the ▲/▼ change from `growth.orderValue.growth` and the new-order count `operational.orderCounts.new`.
   - **Thực thu** = `revenue.collected`, with ▲/▼ from `growth.collected.growth`.
   - **Còn phải thu** = `revenue.outstanding`. The hint shows the red overdue amount `outstandingBreakdown.overduePickup.amount` when it is above 0.
   - **Tiền thực nhận** = collected + `collateralFlow.received` − `collateralFlow.returned`.
   - A change of 1000% or more shows "Mới" instead of a percentage, as the old page did. A missing value shows "—".

4. **Chart.** It shows Thực thu (`series[].collected`, falling back to `realIncome`) or Số đơn mới (`newOrderCount`, falling back to `orderCount`) per day.
   - For a month grouping it shows per month.
   - The last bar is highlighted.
   - For Hôm nay it shows the last 7 days.

5. **Việc hôm nay.** All of it comes from `/api/analytics/outlet-operations`:
   - **Cần giao hôm nay** shows `pickupsToday.count`, with a progress bar and "Đã giao d/t", where d = `doneToday.pickups` and t = d + count.
   - **Cần nhận trả hôm nay** works the same way with returns.
   - **Đang thuê · trễ hạn trả** shows `overdueReturns.count`.
   - **Quá ngày lấy, khách chưa đến** shows `noShows.count`.
   - **Ngày mai** shows "Giao p · Trả r" from `tomorrow`, falling back to the tomorrow list counts.
   - Each line links to the order list.

6. **Money cards.** These need the revenue permission:
   - **Thực thu gồm** lists the four `collectedBreakdown` lines (refunds shown negative) and the total.
   - **Còn phải thu** has an at-pickup line and an overdue-pickup line, each with its order count, plus the total.
   - **Thế chân** shows received and returned in the period. The "SẮP TỚI" box shows the held-to-return amount and the to-collect amount from `outlet-operations.cash` when `cash` is not null.

7. **Đơn cần làm hôm nay.** The rows are:
   - today's pickups (tag Cần giao);
   - today's returns and overdue returns (tag Cần trả), without duplicates.

   Each row shows:
   - the customer and `#orderNumber`;
   - the planned days;
   - a note: "Chưa soạn đồ" for a pickup not ready to deliver, or "Trễ n ngày" for a late return;
   - the money: "còn thu X" (amountDue), "hoàn cọc X" (refundDue), or "+ phí X" (amountDue on a return);
   - an action button linking to `/orders/{orderNumber}`.

   An empty list shows one line of text.

8. **Thuê nhiều nhất.** This lists `topProducts` (image or placeholder, name, "n lượt thuê", value). Cancelled orders are already excluded by the API.

9. **Loading and errors.** Every block shows a skeleton while loading. A failed request shows "Không tải được số liệu" with a Thử lại button.

10. **Layout and theme.** Colours come from `ar-*` tokens. The layout reflows to one column at 390px.

## Out of scope

- The outlet switcher, and outlet filtering of the period report (that endpoint takes the caller's scope).
- In-place pickup and return actions. Those happen on the order page, as before.
- Any API change.

## API and data

None. Reads `GET /api/analytics/period?startDate&endDate[&groupBy]&limit=5` and `GET /api/analytics/outlet-operations`.

## Acceptance

- [ ] 2, 3, 5 and 7: unit tests on the pure model (`overview-model.ts`) under both TZ values.
- [ ] 1–10: screenshots at 1440px and 390px, light and dark, with mocked API data, compared with the board.
- [ ] New `dashboard.home.*` keys exist in all five locales.
- [ ] Lint, client and admin type-check at the `dev` baseline, and the client build compiles.
