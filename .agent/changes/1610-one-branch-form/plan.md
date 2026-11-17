# Plan — #1610

Issue: #1610 · Status: accepted · Spec: ./spec.md

1. Failing test: `tests/web-product-listing-model.test.ts` (the page has no `form.quantityAt` hint).
2. `ProductFormPage.tsx`: drop the hint.
3. Verify: the web model tests, `tsc -p apps/client`, lint of the file, headed Chrome on a local web + API: a shop with one
   open branch (create, edit) and a shop with two (unchanged).
