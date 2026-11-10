# iOS Orders: no old-branch rows after the outlet changes

Issue: #1525 · Author: Trinh Tran · Status: accepted · Created: 2026-11-10

## Problem

A MERCHANT with 2+ outlets switches the branch on Products. On Orders, only the segment on screen reloads. The other
segments ("Việc cần làm", "Tất cả đơn", "Đơn bán") keep the rows of the old branch (snapshot, not dirty) for up to
5 minutes. Android already marks every list dirty on a branch change.

## Proposed outcome

After a branch change no segment shows rows of the previous branch: all lists are dirty, old snapshots are dropped,
the segment on screen reloads at once. A unit test on `OrdersHomeViewModel` proves it.

## Affected users and systems

MERCHANT with 2+ active outlets, iOS app (`OrdersViewController`, `OrdersHomeViewModel`). No API change.

## Constraints

Do not change the quiet refresh after an order change (#674) or the segment switch that shows a fresh snapshot.

## Open questions

- Android: not reproduced by reading the code; a quiet refresh that fails keeps old rows silently. Separate issue if seen on a device.

## Decision log

- 2026-11-10 — fix on iOS only; owner uses iOS (Trinh Tran)
