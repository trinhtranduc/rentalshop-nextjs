# iOS product detail chips show a count but no order rows

Issue: #1037 · Author: agent · Status: approved (owner bug report) · Created: 2026-10-17

## Problem

On iOS product detail, "Sắp tới N" / "Đang thuê N" / "Đã xong N" show a count but the list under the chip is blank.
Since #891 each row is an `OrderRowCell` (a `UITableViewCell`) placed in a stack view; outside a table view the
cell's `contentView` keeps its autoresizing frame, so the cell gets no Auto Layout height and collapses to 0 pt.
Customer detail (#891) builds its rows the same way.

## Proposed outcome

Each chip shows its orders as full-height rows; tapping a row opens the order.

## Affected users and systems

All roles on iOS (product detail, customer detail). API and Android unchanged.

## Constraints

No API change. Do not touch the "Tất cả N" screen sort (#1025). Table-view uses of `OrderRowCell` stay as they are.

## Decision log

- 2026-10-17 — fix the embedding (contentView pinned with Auto Layout) in one shared helper used by both screens.
