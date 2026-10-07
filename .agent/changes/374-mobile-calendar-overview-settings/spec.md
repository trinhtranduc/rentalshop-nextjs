# Spec — Mobile calendar, overview and settings

Issue: #374 · Status: accepted · Intent: ./intent.md

## Behavior

### Calendar [Lich] — flag `newCalendar`
1. Header "Lịch" with ‹ month › navigation ("Tháng 10/2026"). Month grid starts on Monday (T2 … CN); days of the
   neighbouring months are greyed and not tappable; today is filled dark.
2. Marks per day from `GET /api/calendar/orders/count?month&year&timeZone` `byDate`: a filled dot when
   `pickups > 0`; a ring when `returns > 0` on today or a later day; a red square when `returns > 0` on a day before
   today (those rentals are still out, so they are late). Legend: Giao, Trả, Trễ hạn trả.
3. Tapping a day lists its hand-overs (`by-date?date&status=RESERVED&timeZone`) and returns
   (`by-date?date&kind=return&timeZone`). Header "HÔM NAY · T7 03/10" (or the day label) with
   "N trễ · giao X · trả Y"; "N trễ" is `lateReturns` and shows on today only.
4. Row: tag Giao / Trả, customer, items ("Áo dài ×2, …"), total; a hand-over or return on a past day shows
   "Trễ N ngày" in red. Tapping a row opens the order detail through the existing router.
5. Opening the tab selects today; moving to another month selects its first day (today when it is that month).
   A late answer for an old month or day never replaces the current one.

### Overview [Tong-quan, Tong-quan-chon] — flag `newOverview`
6. Period button ("7 ngày qua ⌄") opens a sheet: Hôm nay, Hôm qua, 7 ngày qua, 30 ngày qua, Tháng này, Tháng trước,
   each with its dates, and "Chọn khoảng ngày…" (existing range picker). Default 7 ngày qua.
7. Period keys in the device zone: Hôm nay = [T, T]; Hôm qua = [T−1, T−1]; 7 ngày = [T−6, T]; 30 ngày = [T−29, T];
   Tháng này = [1st, T]; Tháng trước = [1st, last] of the previous month. The previous period is the same number of
   days right before the start.
8. `GET /api/analytics/period?startDate&endDate&groupBy&limit=3`: "Tiền thu ròng · <range>" =
   `revenue.totalActualRevenue`; per-day bars from `series[].realIncome` (per month when the range is over 45
   days); "▲/▼ N% so với <previous range> · không tính đơn huỷ" from `growth.revenue.growth`.
9. ĐƠN: Đơn mới (`operational.orderCounts.new`), Đang cho thuê (`cash.depositsHeld.orders`), Đang thuê · trễ hạn trả
   (`overdueReturns.count`), Thế chấp đang giữ (`cash.depositsHeld.securityDeposit`), the last two from
   `outlet-operations?timeZone`.
10. THUÊ NHIỀU NHẤT: `topProducts` (image, name, "N lượt thuê", revenue). Cancelled orders are excluded by the server.
11. Without `analytics.view.revenue` (OUTLET_STAFF) the money, the bars, top products, Đơn mới, Đang cho thuê and
    collateral are hidden, and so is the period button; a missing `cash` hides its rows.

### Settings [Cai-dat] — flag `newSettings`
12. Profile row (initials, name, role · store). CỬA HÀNG: Thông tin cửa hàng, In hóa đơn (receipt note, in the
    printer screen), Máy in (saved printer address). QUẢN LÝ: Khách hàng (Android), Người dùng (`users.manage`),
    Xuất dữ liệu (export rights, never OUTLET_STAFF). TÀI KHOẢN: Gói dịch vụ ("Dùng thử · còn 43 ngày" from
    `subscriptions/status`, hidden when it fails), Ngôn ngữ (current language; opens the system language settings),
    Đổi mật khẩu (current / new ≥ 6 / confirm → `POST /api/auth/change-password`, then sign in again),
    Thông tin ứng dụng, Xóa tài khoản (as today). Đăng xuất. No outlet item.

## Out of scope

Counts next to Khách hàng / Người dùng, overview rows linking to lists, late-fee amounts on calendar rows, any API
change, new sub-screens other than the password dialog.

## API and data

Reads only, plus the existing change-password call. Numeric ids only. `timeZone` sent to calendar and
outlet-operations; `analytics/period` takes device-zone date keys and `timeZone` (after #355).

## Acceptance

- [ ] Unit tests on both apps: preset ranges across month and year edges, previous period, calendar marks,
      settings rows by role, response parsing with missing optional fields
- [ ] Each flag off keeps the current tab
- [ ] New strings in vi and en (the apps have no ja/ko/zh)
- [ ] Checked against a local API with merchant and staff
