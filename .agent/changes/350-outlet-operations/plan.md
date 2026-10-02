# Plan — Outlet operations panel

Issue: #350 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests (day window, db where clauses, route scope).
2. `apps/api/lib/outlet-operations-day.ts`: today window + `daysBetweenDateKeys` (`timezone-dates`).
3. `packages/database/src/outlet-operations.ts` → `db.outletOperations.get({ outletIds, start, end, includeCash })`.
4. `apps/api/app/api/analytics/outlet-operations/route.ts` (`api-route-standard`, zod, scope).
5. `packages/utils`: `apiUrls.analytics.outletOperations`, `analyticsApi.getOutletOperations`.
6. `apps/client/app/dashboard/OutletOperationsPanel.tsx` + mount in `page.tsx`.
7. i18n `dashboard.operations.*` en + vi (`i18n-keys`).

## Verify

`TZ=UTC` and `TZ=Asia/Ho_Chi_Minh` jest runs; API build; client tsc; localhost Playwright as 3 roles.

## Risks

Query cost on large outlets (indexed columns, 50-row cap). Staff money leak (route test).

## Rollback

Revert; additive endpoint and UI.
