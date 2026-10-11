# Spec — #654 server

1. **Every image indexed.** A product's point ids are `uuidv5("<productId>:<imageIndex>")` in a fixed
   namespace (`productImagePointId`). Indexing deletes the product's points (filter `productId`), then
   upserts one point per image. A product with no images gets its points deleted. If images exist but no
   vector could be made, the job fails (retried) and old points stay. The backfill
   (`generateAllProductEmbeddings`) runs the same per-product path; no random ids.
2. **One row per product.** `ProductVectorStore.search` asks Qdrant for more points, groups by
   `productId` keeping the best score (`groupHitsByProduct`), then cuts to `limit`.
3. **Reclaim.** `db.embeddingJobs.reclaimStale()` moves `RUNNING` jobs started more than
   `EMBEDDING_JOB_STALE_MINUTES` (default 15) ago back to `PENDING`, or to `FAILED` when
   `attempts >= maxAttempts`. The cron route calls it before `processPending` and returns `reclaimed`
   (additive). `/api/cron/embedding-jobs` authenticates with `CRON_SECRET` in the route (Bearer or
   `x-cron-secret`), and is listed in `route-auth.ts` so the JWT middleware lets it through.
4. **Search timeout.** `generateEmbeddingFromBuffer` (the search path) aborts after
   `PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS` (default 20000). URL/S3 indexing keeps `PYTHON_EMBEDDING_TIMEOUT`
   (300 s prod / 90 s dev). The abort message contains "timeout", which the route maps to
   `SEARCH_TIMEOUT` (503).
5. **i18n.** The five codes in `locales/{en,vi,ja,ko,zh}/errors.json` and `locales/vi/errors-mobile.json`.
6. **Python hygiene.** No part of the AWS secret is logged (Node or Python). CORS origins come from
   `CORS_ALLOWED_ORIGINS` (comma list); default none (the service is called server-to-server).

Env (all optional, unset = default above): `PYTHON_EMBEDDING_SEARCH_TIMEOUT_MS`,
`EMBEDDING_JOB_STALE_MINUTES`, `CORS_ALLOWED_ORIGINS` (Python).
