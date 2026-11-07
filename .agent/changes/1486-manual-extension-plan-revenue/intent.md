# Manual extension counts in Plan revenue

Issue: #1486 · Author: Trinh Tran (with Claude) · Status: in-progress · Created: 2026-11-07

## Problem

The admin Extend dialog defaults to Method "Manual Extension". `POST /api/subscriptions/[id]/extend` writes a Payment only for
`PAYMENT_RECEIVED` (`apps/api/app/api/subscriptions/[id]/extend/route.ts:183`, rule of #785), so a manual extension whose amount the
admin typed leaves no Payment and the Dashboard block "Plan revenue" (`apps/api/lib/admin-revenue.ts`, #1482) does not count it.
The owner records bank transfers this way and sees revenue lower than the money received.

## Proposed outcome

A `MANUAL_EXTENSION` request with an `amount` > 0 writes a `PLAN_EXTENSION` / `COMPLETED` Payment, counted by `GET /api/admin/revenue/monthly`
like any renewal. `ADMIN_EXTENSION` and `COMPENSATION` stay free. A `MANUAL_EXTENSION` without `amount` (auto-calculated) writes no Payment.

## Affected users and systems

`ADMIN` (admin web: `apps/admin/app/subscriptions/page.tsx:308`, `subscriptions/[id]/page.tsx:177`, `merchants/[id]/page.tsx:272`).
No iOS, Android or client caller of the route. No migration.

## Constraints

Additive; no response field changes. Past manual extensions have no Payment row: they are not changed here (a back-fill from the owner's list is separate).
The dialog always sends `amount` (pre-filled with the calculated price): the admin must clear it or choose Admin Extension / Compensation for a free grant.

## Open questions

- None.

## Decision log

- 2026-11-07 — Manual Extension counts only when the admin sent an amount, never for an auto-calculated one (owner: "manual cũng cần tính doanh thu như các gia hạn tự động")
