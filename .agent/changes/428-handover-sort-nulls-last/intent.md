# Orders sorted by hand-over date start with orders that have no planned pickup

Issue: #428 · Author: Trinh Tran · Status: approved · Created: 2026-10-05

## Problem

Orders → All orders → sort "Hand-over date" (iOS and Android send `sortBy=pickupPlanAt`) shows
cancelled orders with a NULL `pickupPlanAt` first. Found in the #391 e2e run.

## Proposed outcome

Orders without a planned pickup come last, in both sort directions.

## Affected users and systems

All merchant roles on iOS, Android and web that sort the order list by planned pickup or return.
`GET /api/orders` → `db.orders.findManyLightweight`.

## Constraints

- No response-shape change. Merchant scoping and defaults (`createdAt desc`) unchanged.
- Failing test first (`bug-fix-tdd`).

## Decision log

- 2026-10-05 — NULLs last for both `asc` and `desc` (issue text).
