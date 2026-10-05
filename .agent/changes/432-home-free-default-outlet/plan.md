# Plan — Home "N free" for a merchant counts stock across all outlets

Issue: #432 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing test `tests/api/products-list-merchant-default-outlet.test.ts` (bug-fix-tdd); commit alone.
2. `apps/api/app/api/products/route.ts` GET: when role is MERCHANT, the request is mobile and there is
   no `outletId`, look up `db.outlets.findDefaultForMerchant(userScope.merchantId)` and use its id as
   the availability outlet. No filtering, no error when none is found.
3. Skills: `api-route-standard`, `api-compat-review`, `mobile-parity` (no app change: both apps
   already read `effectiveAvailableToday ?? available`).
4. Verify: `cd tests && npx jest api/`; `npx tsc --noEmit -p apps/api/tsconfig.json` (no errors on
   changed lines).

## Files

- `apps/api/app/api/products/route.ts` — default availability outlet for mobile merchants
- `tests/api/products-list-merchant-default-outlet.test.ts` — regression

## Risks

- Older mobile screens for a multi-outlet merchant now show the default outlet's stock instead of the
  sum. Intended: orders from the apps land in the default outlet (#398).

## Rollback

Revert the fix commit; behavior returns to all-outlets numbers.
