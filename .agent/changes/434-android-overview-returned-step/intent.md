# Android: overview "New orders" list title and returned-order step bar

Issue: #434 · Author: Trinh Tran · Status: approved · Created: 2026-10-05

## Problem

Found in the #391 e2e run on Android:

1. Overview v2 "New orders" opens a list titled "New rentals", yet it lists sales and
   later-cancelled orders (first row SALE ORD-001-0022, Cancelled). The card counts every
   order created in the period (`operational.orderCounts.new`: both types, only orders
   cancelled at creation left out), and the list (`GET /api/analytics/income/orders?status=new`)
   holds the same orders. iOS titles the list with the card label, "New orders".
2. The order detail step bar of a returned order shows the planned return day
   (#746120 returned 05/10, shows "Return 08/10"). iOS shows `returnedAt ?? returnPlanAt`
   and `pickedUpAt ?? pickupPlanAt`. Android never parses `pickedUpAt` / `returnedAt`.

## Proposed outcome

- The "new" drill-down is titled "New orders" / "Đơn mới", like the card and iOS.
- The step bar shows the actual hand-over and return days when the order has them, else the plan.

## Affected users and systems

Every shop role on Android with `newOverview` / `newOrderDetail`. No API, web or iOS change.

## Constraints

Failing unit test first (`bug-fix-tdd`). No API change. Display days use the device zone, like iOS
(`timezone-dates` rule 8: display only); tests pin `Asia/Ho_Chi_Minh`.

## Open questions

- Overview "Net income" (2 for the last 7 days) vs the bars: checked and reported in the PR, not changed here.

## Decision log

- 2026-10-05 — keep the list content (it matches the count and iOS); fix the title (issue: "match the card's definition and iOS").
