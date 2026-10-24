# Plan — Basic / Pro in use, expired, totals

Issue: #1198 · Status: accepted · Spec: ./spec.md

## Steps

1. Extend stats + hrefs (`basicAll`, `proAll`, `basicExpired`, `proExpired`).
2. Dashboard tiles: chips on Merchants, In use, Expired; `totalOf` for plan-only and expired+plan.
3. Tests + e2e (`dash-chip-basic-all`, `dash-chip-pro-all`, `dash-chip-basic-expired`, `dash-chip-pro-expired`).
4. Expired / Merchants tiles with chips use `*-open` click targets in e2e (same as In use).

## Files

- `apps/admin/app/dashboard/{page.tsx,subscription-stats.ts}`
- `tests/admin-dashboard-merchant-filters.test.ts`
- `tests/e2e/web/admin-dashboard-stats.web.js`

## Skills

`implement-issue`. API already ANDs; no LOG unless matcher changes (already in #1196).

## Risks

Admin-only. Expired tile click target becomes `dash-tile-expired-open`.

## Rollback

Revert the commit.

## Verify

```
cd tests && yarn test admin-dashboard-merchant-filters
```
