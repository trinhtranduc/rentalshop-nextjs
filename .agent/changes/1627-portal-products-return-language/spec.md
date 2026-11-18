# Spec — back to the product list keeps its filters; a new tab keeps the language

Issue: #1627 · Status: in-progress · Intent: ./intent.md

## Behavior

1. The product list saves its query (`q`, `category`, `outlet`, `sort`, `page`, `limit`) for this tab each time it changes;
   at the plain list it saves an empty query.
2. `productsListHref(saved)` returns `/products` plus the saved list keys, and `/products` when nothing is saved, the
   value is empty, or it has no list keys. Other keys are dropped.
3. Product detail: "← Sản phẩm" and the page after deleting the product go to `productsListHref`.
4. Product form: on add, "←", "Huỷ" and the not-found notice go to `productsListHref`; on edit, "←" and "Huỷ" still go
   to the product detail, and saving still opens the detail.
5. The top-bar breadcrumb "Sản phẩm" on `/products/*` pages goes to `productsListHref`. The left menu does not change.
6. `appLanguageSync(shown, saved)` on a logged-in page:
   - nothing valid saved → save `appLocaleFor(shown)`; refresh only when that differs from `shown`;
   - saved → no save; refresh when `appLocaleFor(saved)` differs from `shown`.
7. The sync runs on logged-in, non-public pages only, and refreshes at most once per mount (no loop).
8. Headed Chrome: landing `/en` → log in → Products is English and `NEXT_LOCALE=en` is set; the edit page in a new tab
   and F5 are English.
9. Headed Chrome: `NEXT_LOCALE=vi` saved, enter from landing `/en` → the app shows Vietnamese after login.
10. Headed Chrome: list with sort + page 2 → Sửa → Lưu → detail → "← Sản phẩm" lands on the same URL.

## Out of scope

- Other lists (orders, customers) and the left menu.
- Changing where "Lưu" goes.
- The landing, sign-up and public shop language rules.

## API and data

None.

## Acceptance

- [x] Each behavior line has a test or a UI check named in `plan.md`
- [x] No API shape or business rule change (no mobile work)
- [x] No new user-facing strings
- [x] Cancelled orders, Vietnam days, role limits: not touched
