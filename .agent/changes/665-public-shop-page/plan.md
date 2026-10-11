# Plan — #665

1. `apps/client/app/[tenantKey]/products/lib/public-shop.ts`: pure helpers (`formatShopMoney`, `productPriceLines`, `zaloLink`, `shopInitials`). Test in `tests/client/public-shop.test.ts`.
2. Rewrite `components/MerchantHeader.tsx` and `components/PublicProductGrid.tsx`; new `components/PublicProductSheet.tsx`.
3. Locale keys `products.public.*` in en/vi/ja/ko/zh (`i18n-keys`).
4. Verify: test, `npx tsc --noEmit -p apps/client/tsconfig.json`, lint, run client locally against dev-api and screenshot desktop + 390px.
