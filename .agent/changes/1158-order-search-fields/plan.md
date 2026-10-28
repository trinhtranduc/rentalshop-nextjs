# Plan — Order search by name, phone, or order number

Issue: #1158 · Status: accepted · Spec: ./spec.md

## Steps

1. Drop item and product name conditions from `buildOrderSearchConditions`.
2. Update the search hint in `locales/{en,vi,ja,ko,zh}/common.json`, iOS `Localizable.strings`, and Android `strings.xml`.
3. Skills: `api-compat-review`, `i18n-keys`, `mobile-parity`.
4. Verify: `cd tests && yarn test packages/database/order-search-products.test.ts packages/search/order-search-diacritics.test.ts`.

## Files

- `packages/database/src/order.ts` — search conditions
- `tests/packages/database/order-search-products.test.ts` — product name is not a match
- `locales/*/common.json` — web hint
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings` — iOS hint and result line
- `apps/mobile-android/.../values/strings.xml` and `values-vi/strings.xml` — Android hint and result line
- `.agent/api-changes/LOG.md` — installed-app impact

## Risks

Installed iOS and Android builds send the same `q`. After deploy, a search that only matched a product name returns no order. Name, phone, and order number still match.

## Rollback

Revert the commit. `q` matches item names again.
