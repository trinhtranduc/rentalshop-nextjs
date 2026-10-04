# Mobile orders tab (today work, all orders, sales, search)

Issue: #371 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The mobile "Đơn hàng" tab is one paged list with a Rent/Sale switch. Staff cannot see at a glance what to hand
over or take back today, what is late, or what is coming tomorrow. Sale orders show rental fields they do not
have. Search only runs on the search button.

## Proposed outcome

With the `newOrders` app-config flag on, the tab shows the canvas design (artifact DY4DRyDH8Kps9gAw9FExLx):
Việc cần làm (late / today / tomorrow), Tất cả đơn (rent, filter sheet), Đơn bán (grouped by sale day), and one
search box across rent and sale. With the flag off nothing changes.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. Reads `GET /api/analytics/outlet-operations`
and `GET /api/orders`. No API change.

## Constraints

- Installed apps and users without the flag keep the current screen.
- "Quá hạn" is a note ("Trễ N ngày"), not a status.
- Day logic in the device time zone; the server gets `timeZone`.
- A user without `analytics.view.dashboard` still gets a working tab.

## Open questions

- None.

## Decision log

- 2026-10-04 — Plan approved; stacked on #370 (Trinh Tran)
