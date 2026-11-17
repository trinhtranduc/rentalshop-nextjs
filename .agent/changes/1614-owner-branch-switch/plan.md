# Plan — Owner switches branch on the app

Issue: #1614 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests (`bug-fix-tdd`): `tests/api/outlet-operations-route.test.ts`, `tests/api/analytics-outlet-ids.test.ts`,
   iOS `ProductsV2Tests.swift`, Android `BranchListingTest.kt`. Commit alone.
2. API: role check before `userScope.outletId` in `outlet-operations/route.ts` and `income/orders/route.ts`.
3. iOS `Model/ProductsV2.swift`, Android `domain/products/BranchListing.kt`: owner sends `listed=true` too.
4. `.agent/api-changes/LOG.md` row. Skills: `api-compat-review`, `mobile-parity`.
5. Verify: jest both TZ, lint, type-check, iOS build + tests, Android unit tests, e2e on simulator and emulator.

## Files

- `apps/api/app/api/analytics/outlet-operations/route.ts`, `apps/api/app/api/analytics/income/orders/route.ts`
- `apps/mobile/POS ADBD/Model/ProductsV2.swift`, `apps/mobile-android/.../domain/products/BranchListing.kt`

## Risks

- An app older than #828 sends no `outletIds`: the owner now sees the whole shop instead of the first branch (intended).

## Rollback

Revert the PR. No data change.
