# Spec — top products count rentals from RENT orders only

Issue: #429 · Status: approved · Intent: ./intent.md

## Behavior

1. `topProducts[].rentalCount` in `/api/analytics/overview` and `/api/analytics/period` = number of
   order lines of that product in non-cancelled RENT orders created in the range.
2. `topProducts[].saleCount` (new) = the same for SALE orders.
3. The list, its order (revenue desc) and `totalRevenue` are unchanged.
4. `/api/analytics/top-products` items: `rentalCount` = quantity on RENT lines; `saleCount` (new) =
   quantity on SALE lines; `quantity`, `totalRevenue` and the ranking unchanged.
5. CANCELLED orders stay excluded everywhere; outlet/merchant filter unchanged.

## API and data

Additive field `saleCount` (number). `rentalCount` keeps its type; its value drops for products
that were also sold.

## Out of scope

Mobile UI changes (they already show `rentalCount` as "rentals").

## Acceptance

- [ ] `tests/api/top-products-rent-only.test.ts` fails before the fix, passes after
