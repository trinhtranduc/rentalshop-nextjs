# Android product orders: a new sort starts at the top

Issue: #1066 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-18

## Problem

Release e2e for #1049, Android: product detail → "Tất cả N ›" (#1025 / #1036 / #1057). After "Cũ nhất trước" the
first visible row is #0003 (21/10). The API order is right (#0017 on 10/10 first) and iOS is right.

`EntityOrdersScreen` clears the orders and loads page 1 of the new sort, but keeps the same `LazyListState`. The
rows are keyed by order, and `LazyListState` remembers the key of the first visible row: when the new list appears it
follows that key (#0003, first under "Mới nhất trước") to its new place near the end, so #0003 stays on top.

## Proposed outcome

A new sort, period or entity shows the new list from its first row, like iOS (`loadOrders(reset:)` empties the table
and reloads). Loading the next page while scrolling does not jump.

## Affected users and systems

Android only. No API, no iOS, no strings.

## Constraints

Small change in `EntityOrdersScreen`; the query and the row look stay the same.

## Decision log

- 2026-10-18 — scroll to row 0 after the first page arrives and before it is shown (owner task; iOS is the reference)
