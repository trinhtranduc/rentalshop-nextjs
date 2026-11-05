# Revenue block counts manual extensions and add-ons

Issue: #1484 · Author: Trinh Tran (with Claude) · Status: in-progress · Created: 2026-11-04

## Problem

The Dashboard block "Doanh thu gói dịch vụ" (#1482, PR #1483) counted only `type = SUBSCRIPTION_PAYMENT`. The admin Extend modal
records manual and bank-transfer money as `PLAN_EXTENSION` (`apps/api/app/api/subscriptions/[id]/extend/route.ts:188-203`)
and add-ons / plan changes are `PLAN_CHANGE` (`packages/database/src/addon-price.ts:143-150`, `:195-200`,
`packages/database/src/subscription.ts:637`). The monthly revenue was therefore lower than the money received.

## Proposed outcome

`GET /api/admin/revenue/monthly` counts `SUBSCRIPTION_PAYMENT`, `PLAN_EXTENSION` and `PLAN_CHANGE` rows that are `COMPLETED`
(or `REFUNDED` for the refund line). A PENDING `PLAN_CHANGE` is not counted. Details: `.agent/changes/1482-admin-monthly-revenue/spec.md`.

## Affected users and systems

`ADMIN` and `OPS` (admin Dashboard). API route added by #1483, not on `main-real` yet. No iOS, Android or client change.

## Constraints

Additive only; no response field changes; the rules of #1482 stay (Vietnam days, refunds apart, other currencies not converted).

## Open questions

- None.

## Decision log

- 2026-11-04 — Count the three types, COMPLETED / REFUNDED only (coordinator, after reading the writers)
