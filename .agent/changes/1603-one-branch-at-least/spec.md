# Spec — Every product is shown at one branch at least

Issue: #1603 · Status: accepted · Intent: ./intent.md

## Behavior

1. `productsLeftWithoutBranch(unticking, listedElsewhere)` returns the products being unticked that are listed at no
   other open branch.
2. `PUT /api/products/listing` with `isListed: false`: when any product would be left without a listed open branch,
   400 `PRODUCT_NEEDS_ONE_BRANCH` with `data.productIds`, and nothing is written (bulk: all or nothing).
3. `createShowsAtABranch(rows, activeOutletIds)`: `POST /api/products` whose rows list no open branch → 400 same code,
   nothing created.
4. `PRODUCT_NEEDS_ONE_BRANCH` has a sentence in `locales/<12 languages>/errors.json` and the English fallback.
5. Web form (owner, two or more branches): `validateForm(..., { requireBranchAmong })` gives `listed: 'branchRequired'`
   when no open branch is ticked; the text is under the ticks. `listingChanges` sends ticks before unticks.
6. Migration `20261116120000_products_listed_at_one_branch`: a product (not deleted) with no listed row at an open
   branch gets its row at the default open branch (else the open branch with the smallest id) listed, inserted if
   missing. Idempotent; nothing else changes.

## Out of scope

iOS / Android tick order and form check (next build, PR to `dev`). Closing a branch that leaves products unlisted.

## API and data

`PUT /api/products/listing`, `POST /api/products`: new 400 code. Data migration. LOG row.
