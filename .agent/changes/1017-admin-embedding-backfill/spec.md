# Spec — Admin backfill of image-search embeddings

Issue: #1017 · Status: accepted · Intent: ./intent.md

## Behavior

1. `GET /api/admin/embedding-backfill` and `POST` are ADMIN only; any other role gets 403 `INSUFFICIENT_PERMISSIONS`.
2. A "candidate" product is `isActive = true`, `deletedAt = null`, with at least one image (`parseProductImages`).
3. GET returns `{ merchantId, products: { withImages, missingEmbedding, withEmbedding }, jobs: { PENDING, RUNNING, COMPLETED, FAILED }, topMerchants: [{ id, name, missingEmbedding }] (max 10) }`.
   Optional query `merchantId` (positive integer) limits every count to that merchant; invalid → 400.
4. POST body `{ merchantId?: number, includeFailed?: boolean, dryRun?: boolean }` (zod; invalid → 400).
5. POST looks at candidates missing an embedding. A product with a PENDING or RUNNING job is counted in
   `skippedAlreadyQueued` and not queued. A product whose latest job is FAILED is counted in `skippedFailed`
   unless `includeFailed: true`, then it is queued.
6. POST returns `{ merchantId, dryRun, merchants, products, queued, skippedAlreadyQueued, skippedFailed }`;
   `merchants` = distinct merchants among the products queued (or that would be).
7. `dryRun: true` returns the same counts and writes nothing (no job created, runner not kicked).
8. A second POST right after the first queues 0 (all are PENDING now).
9. Jobs are created in batches of 500 with `source: 'admin-backfill'`, `priority: 1`; after writing, the route
   kicks `db.embeddingJobs.processPending({ batchSize: 3 })` without awaiting it (same as sync-embeddings).
10. Response ids are the integer `Merchant.id`; no CUID exists on these models.
11. Admin Settings → Admin Info shows a card with the GET counts, a "Kiểm tra" (dry run) button, a
    "Quét và tạo embedding" button that asks for confirmation inside the card, then shows the result counts.

## Out of scope

Changing the runner, adding a scheduler, re-embedding products that already have an embedding, mobile apps.

## API and data

New route only. New success codes `EMBEDDING_BACKFILL_STATUS`, `EMBEDDING_BACKFILL_QUEUED`,
`EMBEDDING_BACKFILL_DRY_RUN` (in `errors.json`, all five locales). `apiUrls.system.embeddingBackfill` added.

## Acceptance

- [x] Behaviors 1, 5–9 covered by `tests/api/admin-embedding-backfill.test.ts`
- [x] No mobile change (route is admin only)
- [x] New strings in all five locales (`settings.embeddingBackfill.*`, `errors.json` codes)
- [x] Role limits: ADMIN only
