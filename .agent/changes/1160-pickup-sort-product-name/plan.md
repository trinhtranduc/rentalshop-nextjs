# Plan — Pickup sort and product search by name

Issue: #1160 · Status: accepted · Spec: ./spec.md

## Steps

1. Add `pickup` to `SORTS` and the en/vi order sort labels.
2. Match product search on the name, or on a barcode that contains the typed text. Do not match the description.
3. Update the product-list and home-search hints.
4. Skills: `api-compat-review`, `i18n-keys`, `mobile-parity`.
5. Verify: `cd tests && yarn test web-orders-model.test.ts product-search-punctuation.test.ts packages/search/product-search-diacritics.test.ts`.

## Files

- `apps/client/app/orders/orders-model.ts` — sort menu value
- `locales/{en,vi}/orders.json` — label
- `packages/database/src/product.ts` and `product-search-words.ts` — name search, exact barcode
- `locales/{en,vi}/products.json` and `availability.json` — hints
- iOS and Android home search hints
- `.agent/api-changes/LOG.md`

## Risks

Installed apps that search a product by a word in its description, or by part of a barcode, get fewer rows. A full barcode still matches.

## Rollback

Revert the commit.
