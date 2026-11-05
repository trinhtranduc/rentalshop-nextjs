# Admin manual extension with a paid amount fails after saving

Issue: #1462 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-11-03

## Problem

`POST /api/admin/subscriptions/[id]/extend` passes `merchantId` to `payment.create`, but the file never declares
`merchantId`. With `amount > 0` the subscription update has already been saved, then `payment.create` throws
`ReferenceError: merchantId is not defined`: the admin sees a 500, the shop keeps the extra months, and no Payment
(and no `MANUAL_EXTENSION` activity) is written. With `amount` 0 the route works. Present on `main-real` and `dev`.
The API build did not catch it because `apps/api/next.config.js` sets `typescript.ignoreBuildErrors: true`.

## Proposed outcome

- A paid extension answers 200 `SUBSCRIPTION_EXTENDED` (same response shape) and writes one Payment with the
  subscription's `merchantId`.
- An extension with amount 0 writes no Payment.
- The subscription update, the Payment and the activity are written in one `db.prisma.$transaction`, so a failed
  payment write leaves the subscription unchanged.

## Affected users and systems

`ADMIN` only (`withPermissions(['subscriptions.manage'])` + role check). App: `api`. Models: `Subscription`, `Payment`,
`SubscriptionActivity`. No installed mobile app and no web client calls this route (issue #1462, API impact table).

## Constraints

- Response shape unchanged. No schema change.
- Keep the #1459 A13 store-credit behaviour (`manualExtensionBilling`) as it is.
- Smallest change: `merchantId` comes from the subscription row the route already loads.

## Open questions

- None.

## Decision log

- 2026-11-03 — take `merchantId` from the loaded subscription row (`findUnique` without `select` returns it) (agent, per task)
- 2026-11-03 — put the update, the payment and the activity in one interactive transaction: the payment write can still
  fail for other reasons (connection, constraint), and the activity is the audit trail of the same extension (agent)
