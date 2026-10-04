# Plan — A merchant without an outlet cannot create an order

Issue: #398 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing test `tests/api/order-create-merchant-default-outlet.test.ts` (spec 1–9), mocking `db` and auth
   like `tests/api/order-put-status.test.ts`. Commit alone (`bug-fix-tdd`).
2. `packages/database/src/outlet.ts`: `simplifiedOutlets.findDefaultForMerchant(merchantId)` — active
   default outlet of that merchant, else the only active outlet, else `null`.
3. `apps/api/app/api/orders/route.ts` POST: before `orderCreateSchema.safeParse`, a MERCHANT without
   `body.outletId` gets it from `findDefaultForMerchant(userScope.merchantId)`; `null` → 400
   `OUTLET_REQUIRED`. The existing merchant check after `findById` stays.
4. `OUTLET_REQUIRED`: `packages/utils/src/api/response-builder.ts`, `packages/utils/src/core/errors.ts`,
   `locales/*/errors.json`, `locales/vi/errors-mobile.json`, iOS `ErrorCodes.swift` + `Localizable.strings`,
   Android `ApiErrorMessages.kt` + `strings.xml` (`i18n-keys`, `mobile-parity`).
5. Check the other mobile routes that take an outlet (availability, preview/QR, calendar,
   outlet-operations); fix only those that fail the same way.
6. Verify: new test, full `tests/` vs baseline, `npx tsc --noEmit -p apps/api/tsconfig.json` vs `origin/dev`,
   optional local API run against the e2e DB.

## Files

- `packages/database/src/outlet.ts` — scoped lookup
- `apps/api/app/api/orders/route.ts` — fallback before validation
- error-code and locale files above — new code
- `tests/api/order-create-merchant-default-outlet.test.ts` — regression

## Risks

- A merchant with several outlets and no default now gets `OUTLET_REQUIRED` instead of
  `VALIDATION_ERROR`: still a 400, readable text on old apps (they show `message`).
- No migration. No response shape change.

## Rollback

Revert the fix commit. Behavior returns to 400 `VALIDATION_ERROR` for merchants without `outletId`.
