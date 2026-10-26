# Plan — Admin dashboard merchant filters

Issue: #1190 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests (`bug-fix-tdd`):
   - `tests/admin-dashboard-merchant-filters.test.ts` — stats helper + URL mapping
   - Update `tests/admin-dashboard-style.test.ts` hrefs to `/merchants?...`
2. `packages/database/src/merchant-list-filters.ts` — map query → `{ isActive, planId, planName, subscription: applySubscriptionListWhere(...) }`. Skills: none (pure).
3. `packages/database/src/merchant.ts` `search` — apply nested `subscription` + `plan.name` in Prisma. Skill: none.
4. `apps/api/app/api/merchants/route.ts` — stop post-page filter; stop `parseInt(plan)` for names; stop mapping `status=active` to shop isActive. Skill: `api-route-standard`, `api-compat-review`.
5. `apps/admin/app/dashboard/subscription-stats.ts` + `page.tsx` + `DashboardTiles.tsx` — matching counts; tiles → merchants; Basic/Pro chips with `stopPropagation`.
6. `MerchantFilters.tsx` — Expiring soon, Cancelled; keep Inactive.
7. `useMerchantsData` — pass `status`/`plan` as today (API interprets).
8. LOG.md planned row. Verify: `cd tests && yarn test admin-dashboard-merchant-filters admin-dashboard-style subscription-list-where`.

## Files

- `packages/database/src/merchant-list-filters.ts` — new mapper
- `packages/database/src/merchant.ts` — search where
- `apps/api/app/api/merchants/route.ts` — query wiring
- `apps/admin/app/dashboard/subscription-stats.ts` — tile numbers
- `apps/admin/app/dashboard/page.tsx` — hrefs + stats
- `apps/admin/app/dashboard/components/DashboardTiles.tsx` — clickable chips
- `packages/ui/.../MerchantFilters.tsx` — extra status options
- `.agent/api-changes/LOG.md` — planned row
- `tests/admin-dashboard-merchant-filters.test.ts`
- `tests/admin-dashboard-style.test.ts`

## Risks

- Admin bookmark `/merchants?status=active` now lists paid subscriptions (23) instead of every non-deactivated shop. Intended.
- `status=expired` now means period ended, not enum `EXPIRED` only. Matches the Expired tile.

## Rollback

Revert the PR. Installed POS apps unchanged.
