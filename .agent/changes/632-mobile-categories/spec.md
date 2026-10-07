# Spec — mobile category management in the product form

Status: accepted · Intent: ./intent.md

## Behaviors

One category screen, two entries (owner, 2026-10-07: "bấm danh mục ở tạo sản phẩm nên ra new screen").

1. Product form (add and edit, also via Chi tiết sản phẩm → Sửa): tapping Danh mục opens the screen in **pick
   mode**: "Không chọn" first, then the shop's active categories, ✓ on the current one. A tap picks and goes back.
2. Cài đặt → QUẢN LÝ → "Danh mục" (first row; MERCHANT and OUTLET_ADMIN, never OUTLET_STAFF) opens the same screen
   in **manage mode** (no "Không chọn", no ✓, tapping a row does nothing).
3. Search box: accent- and case-insensitive contains ("ao cuoi" finds "Áo cưới"); "Không chọn" hides while searching.
4. ＋ in the header for MERCHANT and OUTLET_ADMIN: name (trimmed, 2–50 chars, like web `validateCategory`) →
   `POST /api/categories`; in pick mode the new category is picked and the screen closes.
5. ⋯ on each row for MERCHANT only: Đổi tên (`PUT /api/categories/{id}`), Xoá (confirm → `DELETE`), no Xoá on the
   default category. After a delete the form clears its choice if that category was picked.
6. OUTLET_STAFF in the form: pick only (no ＋, no ⋯).
7. Errors in the user's language: `CATEGORY_NAME_EXISTS`, `CATEGORY_NAME_REQUIRED`, `CANNOT_DELETE_DEFAULT_CATEGORY`,
   409 `BUSINESS_RULE_VIOLATION` on delete ("Danh mục còn sản phẩm…"); other errors: the API message.
8. iOS and Android behave the same.

## Out of scope

- Description field, sorting, search inside the picker, product counts per category.
- A separate tab for categories.
- Any API, schema or web change.
- Delete check counts soft-deleted products too (API `getStats({categoryId})`); unchanged.

## Tests

- Pure role/validation helpers: iOS unit test (`CategoryRulesTests.swift`), Android unit test
  (`CategoryRulesTest.kt`): who sees add/manage per role, name validation, default category not deletable.
- Manual / e2e on simulator + emulator against a local seeded API (`mobile-e2e-local`): add from the form
  (MERCHANT, OUTLET_ADMIN), no entries for OUTLET_STAFF, rename, delete blocked with products, delete empty.
