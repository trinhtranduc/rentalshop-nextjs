# Plan — Cart order note opens the same sheet as the item note

Issue: #1043 · Status: approved · Spec: ./spec.md

## Steps

1. Logic + tests: `CartV2Logic.orderNoteMaxPhotos(editMode:)` (iOS `ProductsV2.swift`, Android `ProductRules.kt`);
   tests in `ProductsV2Tests.swift` and `CartNoteIconsTest.kt`.
2. iOS: `CartItemNoteSheet` takes title / subtitle / placeholder / hint and optional photos; the cart's order note
   row becomes an entry like `itemNoteButton` and opens the sheet. Remove the now-unused
   `OrderNotesEditorViewController.presentCartNote`.
3. Android: same parameters on `CartItemNoteSheet` with an optional photo row (reuse `PhotoTile` / `AddTile` of
   `NoteEditorV2.kt`); `OrderNoteEntry` replaces the "Ghi chú" value row; the cart stops using `NoteEditorV2`.
4. Strings (`i18n-keys`): `cart.orderNote.*` (iOS en + vi-VN), `v2_order_note_*` (Android values + values-vi).
5. Verify: iOS `POS ADBDTests`, Android `:app:assembleDebug :app:testDebugUnitTest`, screenshots on the simulator
   against a local seeded API (`mobile-e2e-local`).

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/CartV2ViewController.swift` — entry + sheet
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderNotesEditorViewController.swift` — drop the cart presenter
- `apps/mobile/POS ADBD/Model/ProductsV2.swift` — logic
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/home/v2/CartV2Screen.kt` — entry + sheet
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/orders/v2/NoteEditorV2.kt` — tiles `internal`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/products/ProductRules.kt` — logic
- strings files, tests

## Risks

- Losing the #480 photos: kept in the sheet, sent on create as before.
- The Android gallery round trip must not close the sheet (guarded as before with `notePicking`).

## Rollback

Revert the PR; no data or API to undo.
