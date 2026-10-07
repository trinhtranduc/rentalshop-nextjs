# Hide the "paid in full" pay line on mobile order rows

Issue: #458 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

In the new mobile order UI (flag on) an order row with nothing left to collect or refund shows a green
"✓ đã thu đủ" / "✓ paid in full" line under the total. It repeats on most rows and adds no information.

## Proposed outcome

The line under a row total appears only when money is still to collect ("còn thu N") or to hand back
("trả cọc N" / refund). With nothing due, the money column shows only the total, with no empty gap.

Second ask in the same change (owner, 2026-10-05): the Overview drill-down order lists still use the old order card
(full "#ORD-019-0001", uppercase status badge, masked phone with an eye button, three date columns). They should use
the same flat row as the Orders tab, with the same pay-line rule.

## Affected users and systems

All shop roles using the mobile Orders tab. iOS and Android only. No API or data change.

## Constraints

- Cancelled orders keep the struck-through total and no pay line.
- Order detail money rows ("Tổng đơn hàng", "Đã cọc khi đặt", "Đã thu") are untouched. Order detail has no
  "đã thu đủ" line today.

## Open questions

- None.

## Decision log

- 2026-10-05 — "đã thu đủ thì không cần hiện, tại khi trạng thái thay đổi thì đảm bảo thu đủ": a status change
  already guarantees the order is fully paid, so the line is not shown (owner).
- 2026-10-05 — Overview drill-down lists (orders by product / customer, new orders, rented out / collateral held,
  late returns, snapshot lists) use the Orders tab row; header card, data loading, filters and tap → detail stay (owner).
- 2026-10-05 — The drill-down lists follow the same `newOrders` / `NEW_ORDERS` flag as the Orders tab: flag on → new
  row, flag off → the old card, so one flag switches the whole order UI (agent).
