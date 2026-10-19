# Spec — #1087

1. Python service: env `CLIP_MODEL` = `openai` (default, `Xenova/clip-vit-base-patch32`) or `marqo-fashionclip`
   (`Marqo/marqo-fashionCLIP`, `onnx/vision_model.onnx`). Both: input `pixel_values` 1×3×224×224, output
   `image_embeds` 512, same CLIP preprocessing. Unknown value → start fails with a clear error. `/health` adds
   `model` (the key) and `hf_repo`. The Docker image bakes the model of build arg `CLIP_MODEL` (default openai);
   a model not baked is downloaded at start (existing fallback).
2. `POST /api/admin/embedding-backfill` accepts `all?: boolean`. With `all`, every active non-deleted product
   with photos is queued with source `manual-force` (re-embeds, skips cooldown), also products that already have
   an embedding or whose last job failed. A product with a PENDING job: that job becomes `manual-force` (no
   duplicate). A RUNNING job: skipped. `dryRun` writes nothing. Response keeps its fields (`products` is the
   number of candidates) and adds `all` and `upgradedPending`.
3. `POST /api/cron/embedding-jobs` accepts `maxSeconds` (0–270, default 0). 0 = one batch as today. Above 0: run
   batches until no job is processed, or the time is used. Response totals all batches and adds `batches`.
4. Admin card: button "Đánh index lại tất cả": dry run shows the count, confirm, then the real run.
5. Search: unchanged code; it reads the collection of `QDRANT_COLLECTION_ENV` (existing).
