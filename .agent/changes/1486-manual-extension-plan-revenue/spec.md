# Spec — Manual extension counts in Plan revenue

Issue: #1486 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `POST /api/subscriptions/[id]/extend` with `method: 'MANUAL_EXTENSION'` and `amount` > 0 writes one Payment: type `PLAN_EXTENSION`, status `COMPLETED`, method `MANUAL`, that amount, the subscription's merchant.
2. `method: 'PAYMENT_RECEIVED'` and `amount` > 0 (typed or auto-calculated) still writes the Payment.
3. `MANUAL_EXTENSION` with `amount` 0, or without `amount`, writes no Payment (also when `method` is left out: it defaults to `MANUAL_EXTENSION`).
4. `ADMIN_EXTENSION` and `COMPENSATION` write no Payment, whatever the amount.
5. The dialog shows "Not charged" only for Admin Extension and Compensation; its note says which methods record a payment.

## Out of scope

Back-filling Payments for earlier manual extensions; changing the default method; `POST /api/admin/subscriptions/[id]/extend` (already writes a Payment for amount > 0).

## API and data

No field added or changed. Auth stays `ADMIN`. No schema change.

## Acceptance

- [x] Behaviors 1-4: `tests/api/addon-renewal-rules-routes.test.ts` ("extend: which methods leave a Payment")
- [x] Behavior 5: `SubscriptionExtendDialogEnhanced.tsx`; `tests/admin-dialogs-forms.test.ts` still passes
- [x] iOS and Android: not callers of the route
- [x] No new user-facing string key (English literals in the dialog, as before)
- [ ] E2E `BF-PLAN-12` (needs the e2e database) updated, not run here
