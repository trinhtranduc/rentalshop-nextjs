# Owner on the app sees only the products listed at the branch in use

Issue: #1601 · Author: agent · Status: accepted · Created: 2026-11-16

## Problem

#1341 "Hiện ở chi nhánh" hides an unticked product from branch roles and from the owner's web list once a branch
is picked. On iOS / Android the owner (`MERCHANT`) still gets every product, because the apps never send
`listed=true` for the owner (`ProductsV2.swift:1256`, `BranchListing.kt:77`). The owner asked (2026-11-16): products
not shown at this branch must be hidden; one branch is chosen by default; they can still be edited and shown again.

## Proposed outcome

`GET /api/products` from the app (`X-Client-Platform: mobile`) of the owner of a shop with two or more active
branches returns only the products listed at the branch the app sends (`outletId`), or at the shop's default branch
when it sends none. Installed apps get it without a store build.

## Affected users and systems

`MERCHANT` on iOS / Android. `api` only (`apps/api/app/api/products/route.ts`, `apps/api/lib/product-listing.ts`).

## Constraints

- Response shape unchanged. Web (no mobile platform header), branch roles, one-branch shops: unchanged.
- `GET /api/products/{id}` unchanged, so a product still opens from an order and from edit.
- `listed=false` sent on purpose turns the filter off (for a later app screen of hidden products).

## Open questions

- None. "Edit and show again": the web "Tất cả chi nhánh" view, or on the app from another branch where it is listed.

## Decision log

- 2026-11-16 — Fix in the API so installed apps get it ("cần update api") (owner)
