# Spec — Stale business e2e expectations + admin backfill confirm count

Issue: #1029 · Status: approved · Intent: ./intent.md

## Behavior

1. BF-ATT-X03: punch with a valid QR at an outlet with no location → 422 `ATTENDANCE_LOCATION_NOT_SET`, `data.outlet.id` = that outlet. Kiosk before a location → 422 `ATTENDANCE_NOT_CONFIGURED` (unchanged).
2. BF-ATT-X06–X10, X12, X14 pass with no change to their assertions.
3. BF-SUB-34..38: overflow → status 422, `success: false`, `code: PLAN_LIMIT_EXCEEDED`, `error` and `message` = the catalog sentence of a locale (`locales/vi|en/errors.json`).
4. Admin card: "Scan and create embeddings" first runs a dry run with the chosen `includeFailed`; the confirm shows its `queued`.
5. If that count is 0 the card says there is nothing to queue and shows no confirm button.
6. API: a dry run after a real run reports `queued: 0` while GET still reports the products as missing (the case the card must not show as "Queue N?"); dry-run `queued` equals the real run's `queued` for both `includeFailed` values.

## Out of scope

Any API, worker, or mobile change.

## API and data

None. Uses `POST /api/admin/embedding-backfill { dryRun: true, includeFailed }` as it is.

## Acceptance

- [x] 1–3: business e2e; 4–5: admin UI (type-check + lint); 6: `tests/api/admin-embedding-backfill.test.ts`
- [x] iOS/Android: not affected
- [x] New strings: `settings.embeddingBackfill.nothingToQueue`, `checking` in en/vi (the only locales with this admin block)
