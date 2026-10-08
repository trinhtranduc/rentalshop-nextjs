# Plan — #663

1. Failing test `tests/api/public-products-no-cost-price.test.ts` (route with mocked db). Commit alone.
2. `apps/api/lib/public-product.ts`: `toPublicProduct(row)` builds the allowlisted object.
3. Route uses it instead of `...product`.
4. Row in `.agent/api-changes/LOG.md`.
5. Verify: the test, `tests` suite, `npx tsc --noEmit -p apps/api/tsconfig.json`, lint on touched files.
