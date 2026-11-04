# Admin dashboard: monthly revenue of plan payments

Issue: #1482 · Author: Trinh Tran (with Claude) · Status: accepted · Created: 2026-11-04

## Problem

The admin Dashboard chart "Subscription Revenue" adds `subscription.amount` of active / trial plans by `createdAt`
(`apps/admin/app/dashboard/page.tsx:310-316`). That is the price written on the plan when it was created, not money
received. There is no month view, no split by channel (App Store, Google Play, transfer, card), and a refund only flips
`Payment.status` to `REFUNDED` with no date (`apps/api/app/api/webhooks/revenuecat/route.ts:484-489`), so a late refund
silently lowers the total of a past month.

## Proposed outcome

A block "Doanh thu gói dịch vụ" on the admin Dashboard, as in the approved mockup (artifact `9b56KwErJWiGpiyFEfyEY4`, tab
"★ Admin: doanh thu theo tháng"): real money received per Vietnam month, with a month picker and "Cả năm", the
comparison with the previous period, daily bars, a by-channel table, a 12-month table with CSV export and the latest
10 payments. A past month never changes because of a later refund.

## Affected users and systems

`ADMIN` and `OPS` only. Apps: `api` (new route, webhook, manual payment), `admin` (Dashboard). Data: `Payment`
(new nullable `refundedAt`). Not touched: iOS, Android, `client`.

## Constraints

- Additive API only; installed apps on `main-real` never call the new route (`api-compat-review`).
- Store UTC, reason in Vietnam civil days (`timezone-dates`).
- Money is never converted between currencies. No invented exchange rate.
- Keep the other tiles, the rankings and the today / month / year switch.

## Open questions

- None blocking. Points the owner may still change are listed in the decision log (types counted, card channel).

## Decision log

- 2026-11-04 — Refunds are shown separately and never subtracted from a month; a stored `refundedAt` dates them (owner, "theo bạn đề xuất")
- 2026-11-04 — The old "Subscription Revenue" chart and its dead code are removed; tiles, rankings and the period switch stay (owner)
- 2026-11-04 — VND total counts VND payments only; other currencies get their own line, "chưa quy đổi" (owner)
- 2026-11-04 — Only `type = SUBSCRIPTION_PAYMENT` counts, as the owner wrote. `PLAN_EXTENSION` ("Payment Received" in `subscriptions/[id]/extend`) and `PLAN_CHANGE` rows are not counted; one constant in `apps/api/lib/admin-revenue.ts` changes that (agent, flagged to the owner)
- 2026-11-04 — Channel `STRIPE` is grouped with `LEMON_SQUEEZY` under "Thẻ"; `PAYPAL` / `CHECK` go to "Khác", shown only when non-zero (agent)
