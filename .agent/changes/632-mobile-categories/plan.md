# Plan — mobile category management (one PR into dev)

Issue: #632 · Status: accepted · Spec: ./spec.md

## Steps

1. Pure rules, both apps: `CategoryRules` — `canAdd(role)`, `canManage(role)`, `canDelete(category)`,
   `validateName(name)` (2–50 after trim). Unit tests first (iOS `POS ADBDTests/CategoryRulesTests.swift`,
   Android `app/src/test/.../CategoryRulesTest.kt`).
2. iOS (reference): `ProductFormViewController.pickCategory` gets "+ Thêm danh mục" (alert with text field →
   `CategoryService.createCategory(withValues:)`), and for MERCHANT "Quản lý danh mục" opening a small
   `CategoryManageViewController` (V2 list, rename via alert → `updateCategory(categoryId:withValues:)`, delete via
   confirm → `deleteCategory`). Reload `loadCategories()` after each change; keep/clear `categoryId`.
3. Android: `ApiParity` adds `createCategory`, `updateCategory`, `deleteCategory` (+ `isDefault` on `Category`);
   `ProductFormV2Screen` dialog gets the same entries; `CategoryManageSheet` in `ui/home/v2/`.
4. Strings (`i18n-keys`, `mobile-parity`): iOS `Localizable.strings` (vi, en + existing languages), Android
   `values*/strings.xml`; error codes `CATEGORY_NAME_EXISTS`, `CATEGORY_NAME_REQUIRED`,
   `CANNOT_DELETE_DEFAULT_CATEGORY`, `BUSINESS_RULE_VIOLATION` in iOS `ErrorCodes.swift` and the Android error
   table, if missing.
5. Verify: iOS build + unit tests, Android `:app:assembleDebug` + `:app:testDebugUnitTest`, then
   `mobile-e2e-local` on simulator and emulator (visible windows) with MERCHANT, OUTLET_ADMIN, OUTLET_STAFF.

## API compatibility

No API change. PR states "No API change"; no LOG.md row.

## Rollback

Revert the PR; the API is untouched.
