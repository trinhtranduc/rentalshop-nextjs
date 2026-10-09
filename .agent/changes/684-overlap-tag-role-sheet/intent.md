# Cart "Trùng đơn ngày xx" and a role sheet in Thêm người dùng

Issue: #684 · Author: agent (for Trinh Tran) · Status: accepted · Created: 2026-10-09

## Problem
- The cart's booked-out tag lists every clashing order number; it is long and cannot be opened.
- Thêm người dùng preselects Nhân viên and gives no explanation of the roles.

## Proposed outcome
- Tag "Trùng đơn ngày 03/10"; a tap opens the product's Lịch trống on that day (the orders holding it).
- Role field empty by default; a sheet lists the allowed roles with what each can do.

## Affected users and systems
`MERCHANT`, `OUTLET_ADMIN` (add user); every role in the cart. iOS, Android. No API.

## Constraints
iOS is the reference, Android matches, one PR. Stacked on #682 (role list includes Nhân viên kho).

## Decision log
- 2026-10-09 — Show only the day on the tag, tap to see the orders of that day for that product (owner)
- 2026-10-09 — Role empty by default, a sheet explains each role (owner)
- 2026-10-09 — Reuse Lịch trống (#642) for the day's orders instead of a new screen; the orange confirm block keeps its order numbers (agent)
