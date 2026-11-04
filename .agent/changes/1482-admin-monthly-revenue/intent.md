# Admin dashboard: monthly revenue of plan payments

Issue: #1482 · Author: Trinh Tran (with Claude) · Status: in-progress · Created: 2026-11-04

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
- 2026-11-04 — Counted types: `SUBSCRIPTION_PAYMENT` and also `PLAN_EXTENSION` (admin Extend modal, `subscriptions/[id]/extend/route.ts:188-203`, manual money) and `PLAN_CHANGE` (add-ons, `packages/database/src/addon-price.ts`), COMPLETED / REFUNDED only; the first version counted only `SUBSCRIPTION_PAYMENT` and under-counted manual bank transfers (coordinator, after reading the code)
- 2026-11-04 — Channel `STRIPE` is grouped with `LEMON_SQUEEZY` under "Thẻ"; `PAYPAL` / `CHECK` go to "Khác", shown only when non-zero (agent)
- 2026-11-04 — `ja`, `ko`, `zh` get no `dashboard.json`: `tests/phu-phi-wording.test.ts` requires them to stay without one and the admin loads only en and vi. Only the error code goes into their `errors.json` (agent, flagged to the owner)
- 2026-11-04 — an old refund without `refundedAt` is dated by `updatedAt`; no data backfill in the migration (agent)
