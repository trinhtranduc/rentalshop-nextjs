# Plan — Web product pricing default

Issue: #460 · Status: approved · Spec: ./spec.md

## Steps

1. Tests first: `tests/product-pricing-default.test.ts` for spec 1–6 (fails: helpers missing, FIXED-first default).
2. Add `packages/utils/src/core/product-pricing-options.ts`, export from `core/index.ts`; change
   `getPreferredPricingOption` in `order-line-pricing.ts` to default-first.
3. `ProductForm.tsx`: optional rental prices, default selector, validation (6), payload (5), hide prices
   for OUTLET_STAFF / no `products.manage`. `ProductEdit.tsx`: pass `pricingOptions`.
4. Order form: `useCreateOrderForm.ts` comment/start on default; `ProductsSection.tsx` toggle only when both.
5. i18n (`i18n-keys`): `products.pricing.defaultMode`, `products.pricing.defaultFixed`,
   `products.pricing.defaultDaily`, `validation.fields.pricingDefault.dailyNeedsPrice` in en/vi/ja/ko/zh.
6. Verify (`verify-change`): `cd tests && yarn test product-pricing-default order-form-line-pricing`,
   `npx tsc --noEmit -p packages/ui/tsconfig.json`, `-p apps/client/tsconfig.json`, eslint on changed files,
   locale key parity.

## Files

- `packages/utils/src/core/product-pricing-options.ts` (new), `core/index.ts`, `core/order-line-pricing.ts`
- `packages/ui/src/components/forms/ProductForm.tsx`
- `packages/ui/src/components/features/Products/components/ProductEdit.tsx`
- `packages/ui/src/components/forms/CreateOrderForm/hooks/useCreateOrderForm.ts`
- `packages/ui/src/components/forms/CreateOrderForm/components/ProductsSection.tsx`
- `locales/{en,vi,ja,ko,zh}/products.json`, `validation.json`
- `tests/product-pricing-default.test.ts`

## Compatibility

No API change (`api-compat-review`): the payload is the one iOS already sends (`pricingOptions` with `isDefault`,
no `pricingType`). Installed apps unaffected.

## Rollback

Revert the PR. No data or schema change.
