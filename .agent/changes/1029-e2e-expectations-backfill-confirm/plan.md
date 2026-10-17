# Plan — Stale business e2e expectations + admin backfill confirm count

Issue: #1029 · Status: approved · Spec: ./spec.md

## Steps

1. `tests/e2e/business/attendance.e2e.test.js` X03: expect `ATTENDANCE_LOCATION_NOT_SET` + outlet id.
2. `tests/e2e/business/subscription-plan.e2e.test.js`: plan-limit body = code + status exact, sentence from the locale catalog.
3. `tests/api/admin-embedding-backfill.test.ts`: dry run after a real run = 0 while GET missing > 0; dry run = real run for both `includeFailed`.
4. `apps/admin/app/settings/admin/EmbeddingBackfillCard.tsx`: run button → dry run → confirm with `queued`; 0 → nothing to queue.
5. `locales/{en,vi}/settings.json`: `nothingToQueue`, `checking`.
6. Verify: jest file, business-e2e.sh in TZ=UTC and Asia/Ho_Chi_Minh (local DB), tsc admin + api, eslint changed files.

## Risks

Tests only + one ADMIN-only card. No API, no data.

## Rollback

Revert the PR.
