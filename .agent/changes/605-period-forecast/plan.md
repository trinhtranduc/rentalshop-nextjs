# Plan — #605

1. Branch `feat/605-period-forecast` from `origin/dev`; change folder; `.agent/api-changes/LOG.md` row (format of #607).
2. Failing tests first, committed alone:
   - `tests/packages/utils/period-forecast.test.ts` — 16:59:59Z / 17:00Z, today / past / future, collateral,
     deposit + PICKUP payments, no-show, CANCELLED, scope, monthly sums, by-type sums, no query for a past range,
     failure isolation.
   - `tests/api-compat/overview-api-compat.test.ts` — new fields in the allowlist, old shape unchanged, hand-worked values.
   - `tests/e2e/business/overview.e2e.test.js` BF-OVR-09 + `tests/e2e/TEST_CASES.md`.
3. `FIX_MODE=1`: implement in `packages/utils/src/analytics/period-report.ts` (one findMany for RESERVED rent orders
   in range ∩ [today, …); reuse the order-value rows; merge into the series; isolate failures).
4. Verify: Jest under TZ=UTC and TZ=Asia/Ho_Chi_Minh, full suite vs dev, type-check, lint, API build,
   business e2e both TZ.
5. PR into `dev`: `Fixes #605`, `## API compatibility`, before/after JSON.
