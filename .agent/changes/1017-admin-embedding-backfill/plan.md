# Plan — Admin backfill of image-search embeddings

Issue: #1017 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/api/lib/embedding-backfill.ts` — `getEmbeddingBackfillStatus`, `runEmbeddingBackfill` (prisma reads in
   cursor batches of 1000, `createMany` in batches of 500).
2. `apps/api/app/api/admin/embedding-backfill/route.ts` — GET/POST, `withAuthRoles(['ADMIN'], { requireActiveSubscription: false })`,
   zod, `ResponseBuilder`, `handleApiError` (`api-route-standard`).
3. `packages/utils/src/config/api.ts`, `packages/utils/src/api/system.ts` — URL + `systemApi` methods.
4. `apps/admin/app/settings/admin/EmbeddingBackfillCard.tsx` + mount on `page.tsx`.
5. `locales/{en,vi,ja,ko,zh}/settings.json` (`embeddingBackfill.*`) and `errors.json` codes (`i18n-keys`).
6. Tests `tests/api/admin-embedding-backfill.test.ts`.
7. LOG row in `.agent/api-changes/LOG.md` (`api-compat-review`).

## Verify

`npx tsc --noEmit -p apps/api/tsconfig.json`, `npx tsc --noEmit -p apps/admin/tsconfig.json`, `yarn lint`,
`cd tests && yarn test admin-embedding-backfill && npx jest locales-valid-json`.

## Risks

- Large catalogs: status scans products in batches; fine for current size, revisit if it gets slow.
- Many PENDING jobs: they drain at the cron rate; no extra load on the request.

## Rollback

Revert the PR. Queued jobs are normal PENDING jobs; delete them with
`DELETE FROM "EmbeddingJob" WHERE source = 'admin-backfill' AND status = 'PENDING'` if needed.
