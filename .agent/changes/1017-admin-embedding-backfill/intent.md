# Admin backfill of image-search embeddings

Issue: #1017 · Author: Claude (for Trinh Tran) · Status: accepted · Created: 2026-10-17

## Problem

Image search may fail in production because many products have no embedding
(`Product.embeddingGeneratedAt IS NULL`). Embedding jobs run inside the API process and are retried only by
`POST /api/cron/embedding-jobs`, which may not be scheduled on Railway. The only bulk tool is per merchant
(`POST /api/products/sync-embeddings`). The system admin cannot see the gap across all shops or close it at once.

## Proposed outcome

One ADMIN-only action that counts the products missing an embedding (all merchants or one) and queues the
missing embedding jobs, idempotently, with a dry run first.

## Affected users and systems

`ADMIN` only. Apps: `api`, `admin`. Models: `Product`, `EmbeddingJob`, `Merchant` (read). Qdrant via the
existing job runner.

## Constraints

- No schema change; reuse `db.embeddingJobs.processPending`.
- Additive API; no existing caller changes (installed apps never call it).
- Owner: "đơn giản và chuẩn, đừng phức tạp" — one card, no extra screen.

## Open questions

- Queued jobs drain only when the cron runs. The owner must schedule `/api/cron/embedding-jobs` on Railway.

## Decision log

- 2026-10-17 — Route `GET`/`POST /api/admin/embedding-backfill`, card on Settings → Admin Info (Claude, per brief).
- 2026-10-17 — Products whose last job FAILED are skipped unless `includeFailed: true`, so a broken image is not retried forever by default (Claude).
