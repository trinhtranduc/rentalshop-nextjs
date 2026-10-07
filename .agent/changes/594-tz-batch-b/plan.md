# Plan — Timezone batch B (#594)

1. Failing tests (committed alone): `tests/packages/utils/date-range-vn-report-days.test.ts` (B1, B2),
   `tests/api/tz-batch-b-report-routes.test.ts` (B3, B4 through the route handlers with a mocked db),
   `tests/packages/database/order-statistics-vn-days.test.ts` (getStatistics bounds + CANCELLED).
2. FIX_MODE=1. `date-range.ts` → VN days; `excel.ts` → VN wall time and keys.
3. `apps/api/lib/report-days.ts` (import-light): VN today, overdue cutoff, report range, comparison periods.
4. Routes listed in spec B3/B4; `order.ts` getStatistics revenue excludes CANCELLED.
5. Verify: new tests in both TZ, full suite vs origin/dev in both TZ, lint/type-check api + utils + database,
   API build; before/after numbers on `anyrent_biz_b` (seeded) per route.
6. PR into `dev`: compat table, before/after table, audit IDs closed.
