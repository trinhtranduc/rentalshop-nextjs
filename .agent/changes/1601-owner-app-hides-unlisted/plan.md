# Plan — #1601

Issue: #1601 · Status: accepted · Spec: ./spec.md

1. Failing tests (commit alone, `bug-fix-tdd`):
   - `tests/api/product-listing-rules.test.ts`: `ownerAppListedOutlet` cases (spec 1-2).
   - `tests/e2e/business/product-listing.e2e.test.js`: BF-LIST-14 owner on the app (spec 1-5), BF-LIST-13 one branch.
2. `apps/api/lib/product-listing.ts`: add `ownerAppListedOutlet`.
3. `apps/api/app/api/products/route.ts`: read the merchant default branch before the listed filter; use
   `listedOutletForList(...) ?? ownerAppListedOutlet(...)`.
4. `.agent/api-changes/LOG.md`: one row (`api-compat-review`).
5. Verify: unit tests, `tsc -p apps/api`, lint of the two files, business e2e `product-listing` on a local API + DB.
