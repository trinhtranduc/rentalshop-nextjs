# Spec — Order search by name, phone, or order number

Issue: #1158 · Status: accepted · Intent: ./intent.md

## Behavior

1. A non-empty `q` (or `search`) on order search matches an order when the order number contains the text, the customer phone contains the text, or the customer name contains the text.
2. Customer-name matching stays accent-insensitive: `hong` matches `Hồng`.
3. The same query does not match an order only because an item or product name contains the text.
4. The shop-web search hint, the iOS orders search hint, and the Android orders search hint say name, phone, or order number.

## Out of scope

Sorting the order list by pickup day. Product search. Barcode scan. Customer search.

## API and data

`GET /api/orders` query `q` / `search`. No response field added, removed, or retyped. Scope stays the caller's merchant.

## Acceptance

- [x] `tests/packages/database/order-search-products.test.ts` asserts no item or product condition
- [x] `tests/packages/search/order-search-diacritics.test.ts` still covers name, phone, and order number
- [x] iOS and Android hint strings updated
- [x] `shell.searchPlaceholder` updated in en, vi, ja, ko, zh
