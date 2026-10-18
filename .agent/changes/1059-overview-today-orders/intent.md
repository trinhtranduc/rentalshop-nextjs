# Overview "Hôm nay": orders created today instead of the Top cards

Issue: #1059 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-18

## Problem

On the Tổng quan tab with the "Hôm nay" chip, "Top sản phẩm" and "Top khách hàng" rank a single day: one to three
rows that say little. The owner wants to see the orders that came in today.

## Proposed outcome

With a one-day range of today (the Hôm nay chip, or Tuỳ chọn picking today), the two Top cards are replaced by one
card "Đơn tạo hôm nay": a summary "N đơn · Tổng giá trị <total>" equal to the "Giá trị đơn mới" tile, then the five
newest orders created today (customer, "#number · HH:mm · Thuê/Bán", total). Rows open the order; "Xem tất cả" opens
the list behind the tile. 7 ngày / Tháng này / other Tuỳ chọn ranges keep the Top cards.

## Affected users and systems

Roles that see revenue (`showsRevenue`: owner, outlet admin, staff with revenue permission). iOS and Android apps.
No API, web or database change.

## Constraints

- No API change: reuse `GET /api/analytics/income/orders?status=new` (source of the "Giá trị đơn mới" list).
- N and total come from the same `analytics/period` fields as the tile, so they cannot disagree.
- Vietnam civil day (`timeZone=Asia/Ho_Chi_Minh`), the branch chosen on Home (`outletIds`, #828).
- Keep the first-load layout stable (#1033); existing overview UI tests stay green.

## Open questions

- None.

## Decision log

- 2026-10-18 — Owner approved mockup `ovtoday.html` (owner).
- 2026-10-18 — The rule keys off the range, not the chip: a Tuỳ chọn range of exactly today behaves as Hôm nay. Same
  rule as the existing "Hôm nay" counters card (`showsTodayCard`), and the data load is range-based, so this is the
  simplest consistent choice (agent).
- 2026-10-18 — income/orders pages by order id, not by time, so the app loads the day's pages (200 per page, as the
  related list) and sorts by `createdAt` desc itself (agent).
