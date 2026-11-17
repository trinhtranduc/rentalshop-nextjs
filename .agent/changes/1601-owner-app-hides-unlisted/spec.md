# Spec — Owner on the app sees only the products listed at the branch in use

Issue: #1601 · Status: accepted · Intent: ./intent.md

## Behavior

1. `ownerAppListedOutlet({ role, isMobile, listedRaw, queryOutletId, defaultOutletId })` returns the branch to filter by
   for `MERCHANT` on mobile when `listed` is not sent: `queryOutletId`, else `defaultOutletId`, else none.
2. It returns none for any other role, for the web (`isMobile` false), and whenever `listed` is sent
   (`true` keeps the #1341 path; `false` / `0` means no filter).
3. `GET /api/products` uses it when `listed=true` did not already pick a branch; a shop with one active branch still
   ignores the filter (`shopHasSingleActiveOutlet`).
4. A product listed with stock 0 stays in the list (unchanged #1341 filter).
5. Unchanged: web owner list, branch roles, `GET /api/products/{id}`, response fields.

## Out of scope

New app screens (hidden products list). Web default branch. Order create re-listing for old apps (#1341).

## API and data

`GET /api/products`: behavior for the owner on mobile; no new field, no migration. LOG row.
