# Plan — Admin monthly revenue

Issue: #1482 · Status: accepted · Spec: ./spec.md

## Steps

1. Docs and planned row in `.agent/api-changes/LOG.md` (first commit).
2. Red tests, committed alone: `tests/api/admin-revenue-aggregate.test.ts`, `admin-revenue-route.test.ts`,
   `revenuecat-webhook-refunded-at.test.ts`, `payments-manual-fields.test.ts`,
   `tests/packages/admin/dashboard-revenue-model.test.ts`. Run them, paste the failing output.
3. Migration (`db-migration`): `Payment.refundedAt` + index; `yarn db:generate`.
4. API: `apps/api/lib/admin-revenue.ts` (pure aggregation), route `apps/api/app/api/admin/revenue/monthly/route.ts`
   (`api-route-standard`: `withAuthRoles(PLATFORM_OPS_ROLES)`, zod, `ResponseBuilder`, `handleApiError`),
   webhook `refundedAt`, `payments/manual` fields.
5. Client: `analyticsApi.getAdminMonthlyRevenue` + `apiUrls.analytics.adminRevenueMonthly` in `packages/utils`.
6. Admin UI: model `apps/admin/app/dashboard/revenue-model.ts` (month picker, comparison, bars, CSV, money), component
   `components/RevenueBlock.tsx`, CSS in `dashboard.css`; remove the old chart and dead code in `page.tsx` and
   `dashboard-buckets.ts`.
7. i18n (`i18n-keys`): `revenue.*` in `locales/{en,vi,ja,ko,zh}/dashboard.json`, key parity check.
8. Green tests in both zones, then gates: type-check, lint (compare with `origin/dev`), build admin and api.
9. Local seeded DB, admin and api running, headed Chrome screenshots to `~/Documents/AnyRent-shots/admin-revenue/`.
10. `api-compat-review` at PR time, PR in Vietnamese with `Fixes #1482`.

## Files

- `prisma/schema.prisma`, `prisma/migrations/20261104100000_payment_refunded_at/migration.sql` — column + index
- `apps/api/lib/admin-revenue.ts`, `apps/api/app/api/admin/revenue/monthly/route.ts` — new route
- `apps/api/app/api/webhooks/revenuecat/route.ts` — `refundedAt`
- `apps/api/app/api/payments/manual/route.ts` — `processedAt`, `merchantId`, `subscriptionId`, `currency`
- `packages/utils/src/api/analytics.ts`, `packages/utils/src/config/api.ts` — client
- `apps/admin/app/dashboard/{page.tsx,revenue-model.ts,dashboard-buckets.ts,dashboard.css,components/RevenueBlock.tsx}`
- `locales/{en,vi,ja,ko,zh}/dashboard.json`
- `.agent/api-changes/LOG.md`, `.agent/changes/1482-admin-monthly-revenue/`

## Risks

- Migration: additive nullable column and an index on a small table.
- Old refunded rows have no `refundedAt`: they fall back to `updatedAt` (documented).
- `PLAN_EXTENSION` payments are not counted (owner's rule); one constant to change.
- The route reads one year of payment rows in memory (hundreds to a few thousand rows).

## Rollback

Revert the PR. The column and index stay (harmless, nullable) and need no down migration.
