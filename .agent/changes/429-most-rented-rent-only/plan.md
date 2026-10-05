# Plan — top products count rentals from RENT orders only

Issue: #429 · Status: approved · Spec: ./spec.md

## Root cause

`packages/utils/src/analytics/period-report.ts`:
- `computeTopProducts` sets `rentalCount` from `_count.productId` over all non-cancelled orders.
- `computeTopProductsByShop` sets `rentalCount` to the total quantity of all lines.
Neither looks at `order.orderType`.

## Steps

1. Test first (`tests/api/top-products-rent-only.test.ts`), committed red: a product sold once and
   another rented twice; `rentalCount` 0/2, `saleCount` 1/0, CANCELLED still filtered, for both
   `buildAnalyticsPeriodReport` and `computeTopProductsByShop`.
2. Fix `computeTopProducts`: split the ranked products' line counts by RENT/SALE order ids.
3. Fix `computeTopProductsByShop`: select `order.orderType`, sum quantity per type per product+shop.
4. Web dashboard: show `rentalCount` rentals · `saleCount` sales (existing keys).
5. Verify: `cd tests && npx jest api/`, `tsc` on apps/api, eslint on changed files.

## Files

- `packages/utils/src/analytics/period-report.ts`
- `apps/client/app/dashboard/page.tsx` (label only)
- `packages/types` `TopProduct` types if they list `rentalCount`
- `tests/api/top-products-rent-only.test.ts` (new)
