# Plan — In use Trial chip

Issue: #1196 · Status: in-progress · Spec: ./spec.md

## Steps

1. Tests for Trial in-use chip and Basic contains.
2. `merchantPlanNameWhere` Basic → contains `basic`.
3. Dashboard chips + `totalOf('current', 'Trial')` + hrefs.
4. MerchantFilters plan dropdown adds Trial.
5. LOG + e2e case.

## Files

- `packages/database/src/merchant-list-filters.ts`
- `apps/admin/app/dashboard/{page.tsx,subscription-stats.ts}`
- `packages/ui/.../MerchantFilters.tsx`
- tests, e2e, LOG

## Risks

Admin-only `plan=Basic` match widens. POS not a caller.

## Rollback

Revert the PR.

## Verify

```
cd tests && yarn test admin-dashboard-merchant-filters
```
