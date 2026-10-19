# Plan — #1089

1. Tests first: `tests/api/admin-embedding-backfill.test.ts` (priority, raised waiting job, processSeconds
   loop + validation), `tests/embedding-job-reclaim.test.ts` (processPending merchantId filter).
2. `packages/database/src/embedding-job.ts`: `merchantId` filter.
3. `apps/api/lib/embedding-backfill.ts`: `MERCHANT_PRIORITY`, `prioritized`.
4. `apps/api/app/api/admin/embedding-backfill/route.ts`: `processSeconds`.
5. `packages/utils/src/api/system.ts` types; admin card; `locales/{en,vi}/settings.json`.
6. `.agent/api-changes/LOG.md` row. Verify: jest (TZ=UTC), eslint admin/api, tsc on touched files.

Rollback: revert the PR; jobs keep working (priority is only an order).
