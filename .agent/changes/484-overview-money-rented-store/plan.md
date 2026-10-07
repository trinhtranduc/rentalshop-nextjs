# Plan — Clearer Overview money, rented-out list, store info screen

Issue: #484 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests for spec 1–3 in `tests/revenue-calculator.test.js`; commit alone (`bug-fix-tdd`).
2. Add `lateFee` to `OrderRevenueData` and the return/RETURNED formulas in
   `packages/utils/src/core/revenue-calculator.ts`; select `lateFee` wherever orders feed it
   (`income-period-summary.ts`, `period-report.ts`, income routes).
3. Additive fields in `packages/utils/src/analytics/period-report.ts` (spec 4) with a unit test.
4. iOS (`apps/mobile`): Overview V2, rented-out list, store info screen, strings (`mobile-parity`, `i18n-keys`).
5. Android (`apps/mobile-android`): same.
6. Verify: `cd tests && yarn test revenue-calculator`, full `yarn test`, `yarn lint`, `yarn type-check`.
   iOS/Android builds cannot run in the cloud container; say so in the PR.

## Files

- `packages/utils/src/core/revenue-calculator.ts` — late fee
- `packages/utils/src/analytics/income-period-summary.ts`, `period-report.ts` — select lateFee, new fields
- `apps/mobile/POS ADBD/...` Overview V2, Settings EditStore, new rented list
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/overview/v2`, `ui/settings` — same

## Risks

- Revenue totals go up for shops that charge late fees (intended). Web income reports change too.
- Older apps ignore new fields.

## Rollback

Revert the PR; no migration.
