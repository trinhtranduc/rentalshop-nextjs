# Plan — #1095

1. Tests first: `tests/api/admin-embedding-jobs.test.ts` (route), model field in `tests/api/admin-embedding-backfill.test.ts`.
2. `apps/api/lib/embedding-monitor.ts` (list + counts + progress), `apps/api/lib/image-search-model.ts`
   (health + collection), route `apps/api/app/api/admin/embedding-jobs/route.ts`, status adds `model`.
3. `packages/utils/src/api/system.ts`: `getEmbeddingJobs`, types; `apiUrls` entry if used.
4. `apps/admin/app/settings/admin/EmbeddingBackfillCard.tsx` layout; locales.
5. LOG.md row. Verify: jest (TZ=UTC), eslint, tsc on touched files.

Rollback: revert the PR (read-only route, additive field).
