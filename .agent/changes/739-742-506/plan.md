# Plan — #739, #742, #506

1. Red: `BF-FIX-01..06`, `BF-OVR-04` under `BIZ_E2E_SHOW_BUGS=1` on an unfixed build (5 fail).
2. Commit 1 `fix(api)` (#739): `order.ts`.
3. Commit 2 `fix(api)` (#742): `product.ts` + migration.
4. Commit 3 `fix(api)` (#506): `period-report.ts`, `analytics/top-customers/route.ts`.
5. Commit 4 `test(e2e)`: tests, TEST_CASES, API log, this folder.
6. Green: whole business suite in both time zones, 0 failed.
