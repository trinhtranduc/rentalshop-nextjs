# Plan — #629 (one PR into dev)

1. Failing test: BF-PROD-07 in `tests/e2e/business/products-pricing.e2e.test.js` + row in `tests/e2e/TEST_CASES.md`.
   Run, confirm the other-shop create gets 409. Commit `test(api): …`. Then `FIX_MODE=1`.
2. Schema change + `prisma migrate dev --create-only` against a local throwaway DB; read the SQL.
3. Grep for code relying on global barcode uniqueness; adjust if any.
4. Verify: `scripts/e2e/business-e2e.sh` (both TZ), `tsc -p apps/api`, lint, `prisma validate`.
5. Row in `.agent/api-changes/LOG.md`. Commit `fix(api): …`, PR into `dev` with `Fixes #629`.
