# Spec — Home "N free" for a merchant counts stock across all outlets

Issue: #432 · Status: accepted · Intent: ./intent.md

## Behavior

1. `GET /api/products` from a MERCHANT, mobile platform, no `outletId`: `available` and
   `effectiveAvailableToday` are today's free count on the merchant's default outlet
   (`db.outlets.findDefaultForMerchant`), and `totalStock` / `stock` / `renting` are that outlet's,
   exactly as if the app had sent `outletId=<default>`.
2. Same request, merchant has no default and several active outlets: response unchanged from today
   (all-outlets shelf numbers), status 200.
3. Same request from the web (`X-Client-Platform: web`): unchanged, no default-outlet lookup.
4. MERCHANT with an explicit `outletId`: unchanged.
5. The product list itself is never filtered by the default outlet; `outletStock` still lists every
   outlet.

## Out of scope

- App changes. Web product list numbers. Product form stock-outlet choice.

## API and data

No shape change. Value change only for mobile merchant callers without `outletId`. Lookup is scoped
by `userScope.merchantId`.

## Acceptance

- [x] Each behavior line has a case in `tests/api/products-list-merchant-default-outlet.test.ts`
- [x] iOS and Android: no code change needed; both send no `outletId` for a merchant and read
      `effectiveAvailableToday ?? available`
- [x] No new strings
- [x] Vietnam civil day unchanged (same `batchTodayEffectiveAvailability`)
