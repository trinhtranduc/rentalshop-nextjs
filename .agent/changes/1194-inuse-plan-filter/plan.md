# Plan — In-use plan chips filter the merchant list

Issue: #1194 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests: In use chips among `current`; hrefs `status=current&plan=`; tiles `href`.
2. `DASHBOARD_MERCHANT_HREFS` + `totalOf('current', plan)` + chips on In use.
3. `MetricTile` `href` via `next/link`.
4. E2e cases for Basic/Pro/Enterprise include `status=current`.
5. Skills: none of api-route / migration. `mobile-parity`: not callers.

## Files

- `apps/admin/app/dashboard/{page.tsx,subscription-stats.ts,components/DashboardTiles.tsx}`
- `tests/admin-dashboard-merchant-filters.test.ts`
- `tests/e2e/web/admin-dashboard-stats.web.js`

## Risks

Admin-only. No API change.

## Rollback

Revert the PR.

## Verify

```
cd tests && yarn test admin-dashboard-merchant-filters admin-dashboard-style
```
