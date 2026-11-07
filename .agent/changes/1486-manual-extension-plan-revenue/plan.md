# Plan — Manual extension counts in Plan revenue

Issue: #1486 · Status: in-progress · Spec: ./spec.md

## Steps

1. Failing tests first: `tests/api/addon-renewal-rules-routes.test.ts` describe "extend: which methods leave a Payment".
2. `apps/api/app/api/subscriptions/[id]/extend/route.ts`: `paymentReceived` also true for `MANUAL_EXTENSION` when `amount` was sent and > 0.
3. `SubscriptionExtendDialogEnhanced.tsx`: "Not charged" only for `FREE_METHODS`; new note under Method.
4. `tests/e2e/business/plan-change.e2e.test.js` BF-PLAN-12 expects one Payment for the Manual extension.
5. Row in `.agent/api-changes/LOG.md`.
6. Verify: `cd tests && npx jest api/addon-renewal-rules-routes api/admin-extend-paid-payment api/manual-extension-store-credit admin-dialogs-forms admin-renew-mobile-footer`.

## Files

- `apps/api/app/api/subscriptions/[id]/extend/route.ts` — when a Payment is written
- `packages/ui/src/components/features/Subscriptions/components/SubscriptionExtendDialogEnhanced.tsx` — labels and note
- `tests/api/addon-renewal-rules-routes.test.ts`, `tests/e2e/business/plan-change.e2e.test.js` — behavior

## Risks

- Payments: an admin who leaves the pre-filled price on a Manual Extension now books it as revenue. Mitigated by the new note; free grants use Admin Extension, Compensation, or an empty / 0 price.
- Wrongly booked Payments can be corrected by marking the row REFUNDED / deleting it by hand; none are created for past extensions.

## Rollback

Revert the PR: the route goes back to writing a Payment only for `PAYMENT_RECEIVED`. Payments already written stay (they are real money records).
