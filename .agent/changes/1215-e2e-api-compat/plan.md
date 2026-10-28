# Plan — #1215
1. Issue + intent/spec/plan + dòng LOG `planned` (commit đầu).
2. Test đỏ: `tests/api/legacy-sale-price.test.ts`, `tests/api/product-echoed-block-shim.test.ts`; commit riêng.
3. Sửa: `apps/api/lib/legacy-sale-price.ts`, nối vào `productForClient` + 3 route; `packages/database/src/product-pricing-normalize.ts` + `product.ts` (bỏ shim).
4. Sửa spec #1199.
5. Kiểm: Jest TZ=UTC và Asia/Ho_Chi_Minh, `locales-valid-json`, type-check, lint, curl API local.
6. Eval case + dòng "Things agents get wrong"; PR vào `dev`, thân tiếng Việt, `Fixes #1215`.
