# Plan — #1603

Issue: #1603 · Status: accepted · Spec: ./spec.md

1. Failing tests (one commit): `tests/api/product-listing-rules.test.ts` (spec 1, 3, 4),
   `tests/web-product-listing-model.test.ts` (spec 5), `tests/products-listed-at-one-branch-migration.test.ts`
   (spec 6, static), `tests/e2e/business/product-listing.e2e.test.js` BF-LIST-16/17/18 (spec 2, 3, 6 on a real DB).
2. `apps/api/lib/product-listing.ts`: the two pure functions.
3. `apps/api/app/api/products/listing/route.ts`, `apps/api/app/api/products/route.ts` (POST): refuse.
4. `packages/utils/src/api/response-builder.ts` fallback; `locales/*/errors.json` (12) — skill `i18n-keys`.
5. `apps/client/app/products/form/form-model.ts`, `ProductFormPage.tsx`; `locales/*/products.json` `web.form.errors.branchRequired`.
6. `prisma/migrations/20261116120000_products_listed_at_one_branch/migration.sql` — skill `db-migration`.
7. LOG row. Verify: Jest both TZ, tsc api + client, lint, build, e2e product-listing on a local API + a local e2e
   database the new migration was applied to, headed Chrome on the web form.
