# Spec — Admin manual extension with a paid amount fails after saving

Issue: #1462 · Status: approved · Intent: ./intent.md

## Behavior

1. `POST /api/admin/subscriptions/[id]/extend` with `amount > 0` answers 200 with
   `{ success: true, code: 'SUBSCRIPTION_EXTENDED', data: { subscription, newPeriodEnd, monthsAdded } }` (unchanged shape).
2. It writes one Payment: `amount`, `currency` (default `VND`), `method` from `paymentSource` (TRANSFER / CASH, else
   MANUAL), `type: SUBSCRIPTION_PAYMENT`, `status: COMPLETED`, `subscriptionId`, and `merchantId` = the subscription's
   `merchantId`.
3. With `amount` 0 (or no amount) no Payment is written; the extension still succeeds.
4. The subscription update, the Payment and the `MANUAL_EXTENSION` activity run in one `db.prisma.$transaction`.
   If any of them fails, nothing is saved and the route answers the error (500 through `handleApiError`).
5. A running store plan keeps the A13 rule: only `currentPeriodEnd` and `storeBonusMs` change on the subscription;
   a paid amount still writes the Payment.

## Out of scope

- The other extension route `POST /api/subscriptions/[id]/extend` (already uses `subscription.merchantId`).
- Turning off `ignoreBuildErrors` in the API build.
- Admin UI changes.

## API and data

No field added or changed. Request and response shapes unchanged. Admin-only; `merchantId` is read from the
subscription row, never from the request.

## Acceptance

- [x] Each behavior line has a test (`tests/api/admin-extend-paid-payment.test.ts`; A13 also in
      `tests/api/manual-extension-store-credit.test.ts`)
- [x] iOS and Android: not affected (they do not call this route; see issue #1462)
- [x] No new user-facing strings
- [x] Vietnam civil days unchanged (`addMonthsInTimeZone`); tests run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
