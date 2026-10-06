# Intent — #543 Shop web Danh mục on the new shell

Issue: #543 · Status: accepted (owner: "redraw every page still on the old UI, following the design system; many issues, many PRs") · Created: 2026-10-06

## Problem

`/categories` is one of the last QUẢN LÝ pages on the old PageWrapper + shared `Categories` table:
the subtitle repeats the title ("Danh mục / Danh mục"), the search placeholder is English
("Search categories..."), the console logs `IntlError: categories.labels.loading` (missing key), and in
dark mode the page keeps hard-coded light colours.

## Proposed outcome

The page uses the shell tokens and the Nhân viên table style: title with count, "Thêm danh mục",
search in the card, sortable table, paging footer, themed dialogs. Light, dark, 390px. No console errors.

## Affected users and systems

MERCHANT, OUTLET_ADMIN (`products.manage`) manage categories; OUTLET_STAFF only views. `apps/client` only.

## Constraints

- UI only: `useCategoriesWithFilters` (GET /api/categories), `categoriesApi.createCategory / updateCategory / deleteCategory`. No API change → no mobile parity / API-compat work.
- `packages/**` untouched (apps/admin keeps the shared component).
- New strings in `locales/{en,vi}/categories.json` → `web` (ja/ko/zh fall back to en).

## Open questions

- none

## Decision log

- 2026-10-06 — page size options follow the other redrawn tables (10/20/50/100, default 20) instead of the old fixed 25 (agent).
- 2026-10-06 — GET /api/categories ignores `q`, `page`, `sortBy`, `sortOrder` (`categoriesQuerySchema` strips them),
  so the old search / sort / paging never worked. UI-only fix: load one page of 1000 and search (word prefix,
  accent-insensitive), sort and page in `categories-model.ts`. The API schema fix is a separate change (agent).
