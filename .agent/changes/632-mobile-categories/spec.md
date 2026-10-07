# Spec — mobile category management in the product form

Status: accepted · Intent: ./intent.md

## Behaviors

1. The category picker lists "Không danh mục" + the shop's active categories, as today.
2. MERCHANT and OUTLET_ADMIN see a "+ Thêm danh mục" entry. It asks for a name (trimmed, 2–50 chars, same
   rule as the web `validateCategory`). Save → `POST /api/categories {name}`; on success the list reloads and
   the new category is selected in the form.
3. OUTLET_STAFF sees no add and no manage entry.
4. MERCHANT sees "Quản lý danh mục": a list of the shop's categories. Each row: rename, and delete except the
   default category (`isDefault`), same as web `rowActions`.
5. Rename → `PUT /api/categories/{id} {name}`; the list and the form's selected name update.
6. Delete asks for confirmation → `DELETE /api/categories/{id}`. If the form had that category selected, the
   selection is cleared.
7. Errors are shown in the user's language: `CATEGORY_NAME_EXISTS` ("Danh mục đã tồn tại"),
   `CATEGORY_NAME_REQUIRED`, `CANNOT_DELETE_DEFAULT_CATEGORY`, and 409 `BUSINESS_RULE_VIOLATION` on delete
   ("Danh mục còn sản phẩm, chuyển sản phẩm sang danh mục khác trước"). Other errors: the generic message.
8. iOS and Android behave the same (texts, roles, order of entries).

## Out of scope

- Description field, sorting, search inside the picker, product counts per category.
- A Settings row or a separate tab for categories.
- Any API, schema or web change.
- Delete check counts soft-deleted products too (API `getStats({categoryId})`); unchanged.

## Tests

- Pure role/validation helpers: iOS unit test (`CategoryRulesTests.swift`), Android unit test
  (`CategoryRulesTest.kt`): who sees add/manage per role, name validation, default category not deletable.
- Manual / e2e on simulator + emulator against a local seeded API (`mobile-e2e-local`): add from the form
  (MERCHANT, OUTLET_ADMIN), no entries for OUTLET_STAFF, rename, delete blocked with products, delete empty.
