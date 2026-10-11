# Plan — #654 server

Issue: #654 · Spec: ./spec.md · Base `dev`

## Steps
1. `packages/database/src/ml/vector-store.ts`: `productImagePointId`, `groupHitsByProduct`,
   `replaceProductEmbeddings`; grouped `search`.
2. `packages/database/src/jobs/generate-product-embeddings.ts`: index every image with deterministic ids,
   delete points when no images, fail when no vector; backfill reuses `generateProductEmbedding`.
3. `packages/database/src/embedding-job.ts`: `reclaimStale`. Cron route calls it; `route-auth.ts` lists
   `/api/cron/embedding-jobs`.
4. `packages/database/src/ml/image-embeddings.ts`: search timeout; drop the secret-prefix log.
5. `locales/*/errors.json`, `locales/vi/errors-mobile.json`.
6. `python-embedding-service/app/main.py`: no secret logging, CORS from env.
7. `.agent/api-changes/LOG.md` row (planned).
8. Tests: `tests/image-search-indexing.test.ts`, `tests/embedding-job-reclaim.test.ts`,
   `tests/image-search-timeout.test.ts`, `tests/cron-route-auth.test.ts`.

## Cron (Railway) — to set up by a human, not by the agent
Nothing in the repo schedules `/api/cron/embedding-jobs` (Railway cron schedules live in the Railway UI,
not in `apps/api/railway.json`). Same pattern as `subscription-expiry-reminders/route.ts:11-15`:
a small Railway cron service (dev first, then production) with

```
Schedule: */5 * * * *
Command:  curl -fsS -X POST "$API_URL/api/cron/embedding-jobs?batchSize=10" -H "Authorization: Bearer $CRON_SECRET"
```
Before this change the global middleware required a user JWT on that path, so a CRON_SECRET-only call
got 401; it is now in `ROUTE_MANAGED_AUTH_PATHS`.

## After merge (dev only)
Re-index dev with the backfill (`scripts/setup-image-search.ts` against dev) so old random-id points are
replaced. Production backfill only with an explicit human go.

## Verify
```bash
cd tests && TZ=UTC yarn test image-search-indexing embedding-job-reclaim image-search-timeout cron-route-auth
TZ=Asia/Ho_Chi_Minh yarn test (same files)
npx tsc --noEmit -p apps/api/tsconfig.json | grep <changed files>
```

## Rollback
Revert the PR. Deterministic and random points coexist safely; the next index of a product deletes both.
