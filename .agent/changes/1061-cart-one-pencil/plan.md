# Plan — Cart: one pencil for every edit

Issue: #1061 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests first: iOS `ProductsV2Tests` (icons map to `pencil`, the note entry and money row pencils are the
   same image and tint, empty "Ghi chú" is blue); Android `CartNoteIconsTest` (`ITEM_NOTE` / `ORDER_NOTE` = `EDIT`).
2. iOS: `DS.editIcon(size:)` (`Utils/DesignTokens.swift`), `CartV2Icon` (`Model/ProductsV2.swift`),
   `V2.editPencil()` used by `V2ValueRow` and `CartNoteEntry` (`ProductsV2Views.swift`); the note text first, the
   pencil after it.
3. Android: `AppIcons.EditLine` (`ui/common/AppIcon.kt`), `CartV2Icon` (`ProductRules.kt`), `cartIcon` +
   `CartEditIcon` used by `CartMoneyEditRow` and `NoteEntry` (`CartV2Screen.kt`).
4. Verify: iOS `POS ADBDTests`, Android `assembleDebug testDebugUnitTest`, one simulator screenshot.

## Files

- `apps/mobile/POS ADBD/Model/ProductsV2.swift`, `Viewcontrollers/Products/v2/ProductsV2Views.swift`
- `apps/mobile/POS ADBDTests/ProductsV2Tests.swift`
- `apps/mobile-android/.../domain/products/ProductRules.kt`, `.../ui/home/v2/CartV2Screen.kt`
- `apps/mobile-android/.../test/.../CartNoteIconsTest.kt`

## Risks

UI only. No API, no data, no strings.

## Rollback

Revert the PR.
