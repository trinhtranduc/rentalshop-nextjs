# Plan — #1087

1. Python: `CLIP_MODEL` map in `app/models.py`, `/health` model fields, Dockerfile build arg. Check the loader
   locally on the Marqo ONNX (dim 512, `image_embeds`).
2. API: tests first (`tests/api/admin-embedding-backfill.test.ts`, `tests/api/embedding-jobs-cron.test.ts`),
   then `lib/embedding-backfill.ts` (`all`), admin route schema, cron `maxSeconds`.
3. Admin card button + locale keys. LOG.md row.
4. Verify: jest (TZ=UTC), type-check api/admin.

## Rollout on Railway dev (owner)
1. Python embedding service (dev): set `CLIP_MODEL=marqo-fashionclip` (variable and, if the service builds with
   build args, the same build arg), redeploy. Check `GET <python-url>/health` → `"model": "marqo-fashionclip"`.
2. API (dev): set `QDRANT_COLLECTION_ENV=product-images-dev-fashion`, redeploy. The collection is created on the
   first write. Search now reads the new (empty) collection until step 3 finishes.
3. Admin (dev) › Settings › Admin Info › image search card: "Đánh index lại tất cả" → check count → confirm.
4. Cron (dev): `curl -fsS -X POST "$API_URL/api/cron/embedding-jobs?batchSize=20&maxSeconds=240" -H "Authorization: Bearer $CRON_SECRET"`
   every 5 minutes until Waiting = 0. Then test image search with real photos.

## Production (only after dev is good)
Same steps with `QDRANT_COLLECTION_ENV=product-images-pro-fashion`, at a quiet hour (search covers only the
products already re-indexed until the queue is empty).

## Rollback
Set `QDRANT_COLLECTION_ENV` back to the old value (`production` / `development`) and `CLIP_MODEL=openai`
(or unset), redeploy both. The old collection was never touched. Do both together: a query vector from one model
does not match vectors of the other.
