# Plan

1. Unit tests for the pure function (`tests/packages/utils/legacy-plan-days.test.ts`).
2. Function + call it in the three write paths.
3. Flip the 56 `knownBug('#577')` cases of `BF-RT-*-oldAndroid` to plain tests (`date-roundtrip.e2e.test.js`).
4. `data-fix.sql.pending`, `.agent/api-changes/LOG.md` row, `tests/e2e/TEST_CASES.md`.
5. Verify: business e2e in both time zones, unit tests.
