# Plan — Public shop hide prices and open booking

Issue: #1174 · Status: in-progress · Spec: ./spec.md

## Steps

1. Failing tests (`bug-fix-tdd` style for the new rules): `toPublicProduct` nulls prices when hidden; booking POST test that expected 409 now expects 201; `calendarMonth` future days are `free` without availability rows; ImageSearchPanel source does not render `inStockToday` / `outToday`.
2. Schema + migration `show_public_price` (`db-migration`).
3. `toPublicProduct(product, { hidePrices })`; public products GET + image-search use merchant flag; `merchant.showPublicPrice` on the payload.
4. `PUT /api/settings/merchant` + profile GET include the flag (`api-route-standard`).
5. Settings UI toggle (`i18n-keys` in settings 5 locales).
6. Public UI: price helper “Liên hệ”; drop image-search stock chip; BookingPicker no availability fetch; calendar treats unknown future as free (`i18n-keys` 12 public locales).
7. Remove stock loop from booking POST; keep the 409 test as “does not 409”.
8. LOG.md two rows (prices omit; booking no stock 409).
9. Verify: listed jest files; browser on a public shop page.

## Files

- `prisma/schema.prisma`, `prisma/migrations/<ts>_show_public_price/`
- `apps/api/lib/public-product.ts`
- `apps/api/app/api/public/[tenantKey]/products/route.ts`
- `apps/api/app/api/public/[tenantKey]/products/search-by-image/route.ts` (if it maps products)
- `apps/api/app/api/public/[tenantKey]/booking-requests/route.ts`
- `apps/api/app/api/settings/merchant/route.ts`
- `packages/database/src/user.ts` (profile select)
- `packages/utils/src/api/booking-requests.ts` or settings API client
- `apps/client/app/settings/sections.tsx`
- `apps/client/app/[tenantKey]/products/**`
- `locales/*/settings.json`, `locales/*/products.json`
- `tests/*`
- `.agent/api-changes/LOG.md`

## Skills

`db-migration`, `api-route-standard`, `api-compat-review`, `i18n-keys`, `timezone-dates` (calendar days stay VN keys).

## Risks

Public guests can request overlapping items (intended). Stale public tab may format `null` prices until reload. Migration additive default true.

## Rollback

Revert the PR. Column can stay (`true` = old behavior).
