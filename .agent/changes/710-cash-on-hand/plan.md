# Plan — #710

1. e2e first: `tests/e2e/business/cash-on-hand.e2e.test.js` (BF-CASH-01..03), failing against the current API.
   - BF-CASH-01: cashCollected = collected + collateral received − returned, on a period with a pickup (300k) and a return (300k) of different rentals.
   - BF-CASH-02: expectedCash on a day with a RESERVED rental (deposit 50k, total 140k, collateral 300k) = expectedCollected 90k + 300k.
   - BF-CASH-03: expectedCash on the return day of a PICKUPED rental with collateral 200k = expectedCollected − 200k.
2. `packages/utils/src/analytics/period-report.ts`: add `cashCollected` (revenue) and `expectedCash` (series point) from the
   existing collateralFlow and expected computations; add one query for PICKUPED rentals with returnPlanAt in range.
3. Rebuild `packages/utils` dist (committed; used via file: deps).
4. `.agent/api-changes/LOG.md`: one row for #710.
5. Verify: `cd tests && yarn test`-style e2e via `scripts/e2e/business-e2e.sh` in TZ UTC and Asia/Ho_Chi_Minh; type-check `apps/api`.
6. PR body: `## API compatibility` table (the impact review above).
