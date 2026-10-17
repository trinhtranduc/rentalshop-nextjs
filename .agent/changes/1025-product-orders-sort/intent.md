# Sort a product's order list by rental date

Issue: #1025 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-17

## Problem

Product detail → "Tất cả N ›" lists every order of the product, always newest created first
(`sortBy=createdAt&sortOrder=desc`). The owner cannot see the orders by the day they go out or come back.

## Proposed outcome

The list has the same "Xếp theo" control as "Tất cả đơn" (#888): Ngày lấy / Ngày trả / Ngày tạo, gần nhất
trước / xa nhất trước. Default: Ngày lấy, gần nhất trước. The date the list is sorted by is bold in the row's
date chip (#891/#893). iOS and Android.

## Affected users and systems

Every merchant role that opens a product's orders. iOS, Android. No API change.

## Constraints

- No API change: `GET /api/orders` already takes `sortBy=pickupPlanAt|returnPlanAt|createdAt` and `sortOrder`.
- Reuse the "Tất cả đơn" sort bar and "Lọc & sắp xếp" sheet; no new visual style.
- Do not change the Sắp tới / Đang thuê / Đã xong chips on product detail.
- Customer, snapshot, rented-out and late-return lists keep their order.

## Open questions

- none

## Decision log

- 2026-10-17 — default Ngày lấy, gần nhất trước (owner)
- 2026-10-17 — "gần nhất trước" means `desc`, as on Tất cả đơn (`RentOrdersFilter.Direction.nearestFirst`) (agent, matches #888)
- 2026-10-17 — the sheet hides its date-range part here: the screen has its own period (agent)
- 2026-10-17 — the control applies to every `.product` list (product detail and the overview top-product drill-down share the screen mode) (agent)
