# Plan — Admin dashboard full merchant totals

Issue: #1192 · Status: accepted · Spec: ./spec.md

## Steps

1. Extend `tests/admin-dashboard-merchant-filters.test.ts` for In use, unfiltered plan, Merchants hrefs/chips.
2. `merchant-list-filters.ts`: `status=current` (alias active/inuse) = in-use where; plan-only has no period filter.
3. Dashboard: tile totals from `merchantsApi.searchMerchants`; Merchants chip row; In use without chips; `DASHBOARD_MERCHANT_HREFS`.
4. MerchantFilters + merchants page: In use `current`; `active`/`inuse` aliases. List testids.
5. Headed e2e `tests/e2e/web/admin-dashboard-stats.web.js` + `scripts/e2e/admin-e2e.sh`.
6. LOG row #1192. Skills: `api-compat-review` (admin-only meaning of `status=active`), `i18n-keys` (English only), `mobile-parity` (not callers).

## Files

- `packages/database/src/merchant-list-filters.ts`
- `apps/admin/app/dashboard/{page.tsx,subscription-stats.ts,components/DashboardTiles.tsx}`
- `apps/admin/app/merchants/page.tsx`
- `packages/ui/.../Merchants/{Merchants.tsx,components/MerchantFilters.tsx,components/MerchantTable.tsx}`
- `tests/admin-dashboard-merchant-filters.test.ts`
- `tests/e2e/web/admin-dashboard-stats.web.js`
- `scripts/e2e/admin-e2e.sh`
- `.agent/api-changes/LOG.md`

## Risks

`status=active` changes from enum ACTIVE (#1190) to còn hạn. Admin-only; POS does not call the route. Old Active bookmark lists in-period shops (includes trial still in period).

## Rollback

Revert the PR. `status=active` returns to enum ACTIVE.

## Verify

```
cd tests && yarn test admin-dashboard-merchant-filters admin-dashboard-style
WEB_E2E_HEADED=1 scripts/e2e/admin-e2e.sh
```
