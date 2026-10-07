# Mobile: manage categories from the product form

Issue: #632 · Author: Trinh Tran · Status: accepted · Created: 2026-10-07

## Problem

On iOS and Android a shop can only pick an existing category in the product form (iOS
`ProductFormViewController.pickCategory`, Android `ProductFormV2Screen` category dialog). Adding, renaming
or deleting a category needs the web (`/categories`, #543). A shop that only uses the phone cannot create
the category it needs while adding a product.

## Proposed outcome

In the product form's category picker, on both apps:
- MERCHANT and OUTLET_ADMIN see "+ Thêm danh mục"; the new category is created and selected.
- MERCHANT also sees "Quản lý danh mục": rename or delete a category (not the default one).
- OUTLET_STAFF picks only, as today.
Uses the existing `/api/categories` routes. No API change, no migration.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_STAFF. iOS, Android. Reads `GET/POST /api/categories`,
`PUT/DELETE /api/categories/{id}` (unchanged).

## Constraints

- Roles follow the API: POST needs `products.manage` (MERCHANT, OUTLET_ADMIN); PUT/DELETE only MERCHANT
  (ADMIN is the platform role). UI only hides controls; the API already enforces.
- iOS is the reference; Android matches it.
- Keep it lean: name only (no description field on mobile), no new tab.

## Open questions

- none

## Decision log

- 2026-10-07 — Entry point is the product form's category picker, not Settings (owner)
- 2026-10-07 — Roles exactly as the API allows (owner)
- 2026-10-07 — Category management also needs its own screen outside the form: Cài đặt → Danh mục (owner: "quản lý danh mục cần view riêng")
- 2026-10-07 — Tapping Danh mục in the product form opens the category screen (pick mode) instead of an action sheet / dialog; one screen for pick and manage (owner)
