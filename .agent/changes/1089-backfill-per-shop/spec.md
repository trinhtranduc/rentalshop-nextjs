# Spec — #1089

## API (`POST /api/admin/embedding-backfill`, ADMIN only)
1. With `merchantId`, new jobs get priority 5 (`MERCHANT_PRIORITY`) instead of 1, and that shop's waiting
   (PENDING) jobs are raised to 5, so the cron runs them before the system-wide backfill. Response adds
   `prioritized` (waiting jobs raised; 0 without `merchantId`).
2. `processSeconds` (number 0–60, default 0). Above 0 and not a dry run: after queueing, the request runs
   `processPending({ batchSize: 5, merchantId })` batches until a batch processes nothing or the budget is
   used, and the response adds `processing: { batches, processed, completed, failed }`. 0 keeps today's
   fire-and-forget kick. Out of range → 400.
3. `db.embeddingJobs.processPending` accepts `merchantId` (jobs whose product belongs to that merchant).
   Without it, unchanged.

## Admin card
4. Shop picker: an id/name search over the merchants list, "Chọn" on each top-merchant row, "Tất cả shop"
   clears. With a shop: GET status, Kiểm tra, Quét và tạo, Đánh index lại use its `merchantId`.
5. "Đánh index lại shop này": dry run count → confirm → `{ merchantId, all: true, processSeconds: 45 }`, then
   one GET every 15 s while that shop has PENDING + RUNNING jobs; stops on unmount or shop change.
6. A note: the model is chosen for the whole system; a shop not re-indexed after a model switch is not found.
