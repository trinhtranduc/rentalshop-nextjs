# Plan — Product search finds words after punctuation

Issue: #1009 · Status: in-progress · Spec: ./spec.md

## Steps

1. Move the current word rules into `packages/database/src/product-search-words.ts` (no behavior change).
2. Failing test `tests/product-search-punctuation.test.ts` against that module (`bug-fix-tdd`).
3. Fix: separator list, split words on it, `regexp_replace` the column with the same list in SQL, escape LIKE.
4. Check the SQL on a local Postgres (unaccent) with psql.
5. `npx tsc --noEmit -p apps/api/tsconfig.json`, lint, `cd tests && yarn test`.

## Files

- `packages/database/src/product-search-words.ts` — word split, patterns, SQL projection
- `packages/database/src/product.ts` — use it in `findMatchingProductIds` and the fallback
- `tests/product-search-punctuation.test.ts` — regression
- `.agent/api-changes/LOG.md` — row

## Risks

- Wider matches only; a query of only punctuation (e.g. "(") now matches no name. Old apps decode the same shape.
- One `regexp_replace` per column per word; same full scan as before, scoped to merchant, LIMIT 1000.

## Rollback

Revert the PR; no data or schema change.
