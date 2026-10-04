# API: customer order summary total excludes cancelled orders

Issue: #405 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

`GET /api/customers/{id}/orders` returns `summary.totalAmount` as the sum of `totalAmount` over
every order of the customer in scope, cancelled ones included. iOS shows it in the "orders by
customer" header next to the order count, and the redesigned customer detail (#387) shows it as
"Tổng chi". A customer who cancelled a big order looks like a big spender.

## Proposed outcome

`summary.totalAmount` sums only orders whose status is not `CANCELLED`, the same rule as revenue
and top-customer rankings ("Revenue and top-product rankings must exclude CANCELLED orders").

## Affected users and systems

All roles that can open a customer's orders on iOS (and #387 screens). API only; no client change.

## Constraints

- Same field names and types (`summary.totalOrders: Int`, `summary.totalAmount: number`).
- Same role scope (merchant / outlet) and date filters as today.
- Follow `bug-fix-tdd`: failing test committed before the fix.

## Open questions

- None.

## Decision log

- 2026-10-04 — Owner (issue #405): `summary.totalAmount` excludes CANCELLED orders.
- 2026-10-04 — `summary.totalOrders` keeps counting every order in scope, cancelled included. It is
  a count, it equals `total` (the list length the client pages through, which shows cancelled rows
  with their badge), and web `customerOrderStats.count` already counts cancelled orders too.
