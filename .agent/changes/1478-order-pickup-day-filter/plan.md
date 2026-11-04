# Plan — #1478 (hotfix on `main-real`; same fix as #1472 / PR #1473 on `dev`)

1. Red tests (`bug-fix-tdd`): `tests/api/orders-list-pickup-day.test.ts` (spec 1-5, both zones), cases in
   `tests/api/orders-list-phase8.test.ts` (route), `tests/api/tz-batch-b-report-routes.test.ts` (export),
   `tests/web-orders-pickup-filter.test.ts` (web model). Commit the tests alone, then `FIX_MODE=1`.
2. Fix: `packages/database/src/order-date-range.ts` (`pickupDay` branch, appended to `where.AND`),
   `packages/database/src/order.ts` (merchant + search `AND` keeps existing entries), zod enum in
   `packages/utils/src/core/validation-schemas.ts`, `apps/api/app/api/orders/export/route.ts`, types in
   `packages/types` and `packages/utils/src/api/orders.ts`, web `orders-model.ts` + `page.tsx`, locales `orders.json`.
3. `.agent/api-changes/LOG.md` row (planned -> dev).
4. Verify: new + existing orders-list suites, export tests, `orders-model` tests, api-compat golden, lint, type-check.
5. PR into `main-real` (Vietnamese body, `Fixes #1478`, `## API compatibility`), then a sync PR into `dev` (keep the `dev` version of every file).

Hotfix order of commits: red tests, `fix(api)`, `fix(client)` (web + locales), docs. Golden check: the old
`dateField` values build the same `where` on `origin/main-real` and on this branch.

## Query shape and index risk
`Order` has `@@index([pickupPlanAt, returnPlanAt])` and no index on `pickedUpAt`. The list is always scoped by outlet /
merchant (`outletId`, `outlet.merchantId`), so Postgres starts from the outlet indexes
(`(outletId, createdAt)`, `(outletId, status, createdAt)`) and filters; an OR with an unindexed column rules out a
BitmapOr over the two date columns. Cost grows with one merchant's orders, not the whole table. The existing
`dateField=pickedUpAt` has the same profile. If it becomes slow for big shops, a follow-up migration adds
`@@index([pickedUpAt])` (additive, `CREATE INDEX CONCURRENTLY`): not in this PR.
