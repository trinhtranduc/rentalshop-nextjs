# Spec — #1095

1. `GET /api/admin/embedding-jobs` (ADMIN): query `merchantId?`, `status` (PENDING|RUNNING|COMPLETED|FAILED,
   default RUNNING), `since?` (ISO; default now − 24 h), `limit` 1–50 (default 50). Returns
   `{ rows, counts, progress }`:
   - `rows`: newest `updatedAt` first: jobId, productId, productName, thumbnail (first photo or null),
     merchantId, merchantName, status, attempts, maxAttempts, updatedAt, lastError (≤ 300 chars).
   - `counts`: jobs per status for the same shop and `updatedAt ≥ since`.
   - `progress`: `{ since, total, done, running, failed, pending, completedLast10Min, etaMinutes }`;
     `etaMinutes = ceil(pending / (completedLast10Min / 10))`, null when nothing completed in 10 min.
   Ids are integer `EmbeddingJob.id` / `Product.id` / `Merchant.id` (no CUID on these models).
2. `GET /api/admin/embedding-backfill` adds `model { name, hfRepo, collection, reachable }`: python `/health`
   (2 s timeout); collection from `QDRANT_COLLECTION_ENV` with the vector store's rule. Python down →
   `reachable: false`, `name: null`. Old fields unchanged.
3. Admin card (mockup `scratchpad/mcadmin.html`): model line; shop picker (as #1089); progress bar of the last
   run (start time kept in state + localStorage after Re-index / Create, else last 24 h); 3 stats; tabs with
   counts and a table (thumbnail, name linking `/merchants/:id/products/:productId`, shop, status, attempts,
   updated, error); buttons at the bottom; refresh every 15 s only while pending + running > 0, one request
   per endpoint per tick, stops on unmount / shop change.
4. vi/en strings in `locales/{en,vi}/settings.json`.
