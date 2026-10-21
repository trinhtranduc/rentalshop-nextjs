# Spec — Pickup sort and product search by name

Issue: #1160 · Status: accepted · Intent: ./intent.md

## Behavior

1. The shop web Đơn hàng sort menu includes "Ngày lấy sớm nhất", which requests `sortBy=pickupPlanAt` and `sortOrder=asc`.
2. An unknown sort value still falls back to newest.
3. A product search word matches the product name (word prefix, same accent rules). It does not match the description.
4. A fragment of a barcode does not match. The full barcode, ignoring case, still matches.
5. The product-list hint says the search is by name. The phone home hint says name or take a photo.

## Out of scope

Changing order search. Removing the exact barcode match. A new barcode endpoint.

## API and data

`GET /api/products` `q` / `search`. No response field change. `GET /api/orders` `sortBy=pickupPlanAt` was already accepted.

## Acceptance

- [x] `tests/web-orders-model.test.ts` reads `pickup` as `pickupPlanAt` asc
- [x] `tests/product-search-punctuation.test.ts` rejects a description-only word
- [x] Hint strings updated in en and vi
