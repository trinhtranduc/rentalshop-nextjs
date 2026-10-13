# Plan — #951 0đ products, free lines, one line per add

Issue: #951 · Status: in-progress · Spec: ./spec.md

## Steps

1. Tests first (commit): `tests/zero-price.test.ts` (schemas, normalize, branch rules, order lines),
   `tests/web-products-form.test.ts`, `tests/web-create-order-model.test.ts`, business e2e
   `tests/e2e/business/zero-price.e2e.test.js` (BF-ZERO-01..05), iOS `ProductsV2Tests` + cart line tests,
   Android `ProductRulesTest`, `CartPricingToggleTest`, cart line tests.
2. API: `packages/utils/src/core/validation-schemas.ts` (option price ≥ 0), `packages/validation/src/product.ts`,
   `packages/database/src/product-pricing-normalize.ts` (new, pure; used by `product.ts`),
   `apps/api/lib/product-branch-rules.ts` (`pricingKey` ≥ 0).
3. Web: `apps/client/app/products/form/{form-model.ts,ProductFormPage.tsx}` (nullable prices),
   `apps/client/app/products/list/list-model.ts` (0đ option shown), `apps/client/app/orders/create/{create-model.ts,parts.tsx,OrderEditor.tsx}`
   (line has-price rule, 0 in the price box, sale line price, line keys).
4. iOS (reference): `Model/ProductsV2.swift`, `Model/CartItem.swift`, `Model/Cart.swift`, `ViewModels/CartStore.swift`,
   `Viewcontrollers/Products/v2/*`, `NewProductViewController.swift`.
5. Android: `domain/products/ProductRules.kt`, `data/model/Models.kt`, `data/CartStore.kt`, `ui/home/v2/*`,
   `data/ProductsV2Api.kt`.
6. `.agent/api-changes/LOG.md` row; PR compat table (`release-2026-10-12.2`).
7. Verify: jest under TZ=UTC and Asia/Ho_Chi_Minh, tsc api/client, business e2e (DB `anyrent_951`), iOS unit tests,
   Android `assembleDebug testDebugUnitTest`, headed web / Simulator / emulator checks.

Skills: `api-route-standard`, `mobile-parity`, `api-compat-review`, `verify-change`.

## Risks

- Old apps: 0đ product in the cart shows "Nhập giá" and blocks a rent order; editing a 0đ product in an old app
  saves it without a price. No crash (see PR).
- Line-id change in both carts: saved carts migrate on load.

## Rollback

Revert the PR. Products saved with a 0đ option keep it (old apps treat it as no price).
