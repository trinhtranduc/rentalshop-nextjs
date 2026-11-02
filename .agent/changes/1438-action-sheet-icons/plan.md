# Plan — Icons on the order actions sheet rows

Issue: #1438 · Status: done · Spec: ./spec.md

## Steps

1. iOS: `OrderActionSheet.symbol(of:)` next to `title(of:)`; `rowView` adds the icon and indents the text.
2. Android: `orderActionIcon(action)`; `ActionRow` takes the action and draws the icon.
3. Unit tests: `ChangeHistoryTests` (its "Order ⋯ sheet" section) and `OrderActionsSheetIconsTest`.
4. Hand-over photos: the block shows the note editor's tile (`AddPhotoTile`, `AddTile`) and opens the existing chooser (`chooseSource`, `photoChooseSource`). Web always shows its tile. Unit and UI tests move from `orderPhotos.camera` / `orderPhotos.library` to `orderPhotos.add`.
5. Verify: `POS ADBDTests` on a clean simulator; `./gradlew :app:testDebugUnitTest :app:assembleDebug`.
6. Look at the sheet and the photo controls against a local API (own Homebrew :5432 DB): iPhone SE, large iPhone, windowed AVD, as owner and as staff. Screenshots in `~/Documents/AnyRent-shots/action-sheet-icons/`.

No domain skill beyond `mobile-parity` (both apps change together). `i18n-keys`, `api-compat-review`: not triggered.

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderDetailViewController.swift` — the sheet only
- `apps/mobile/POS ADBDTests/ChangeHistoryTests.swift` — mapping test
- `apps/mobile/POS ADBD/Utils/DesignTokens.swift`, `.../OrderDetail/OrderPhotoBlockView.swift`, `.../OrderDetail/OrderNotesEditorViewController.swift`, `POS ADBDTests/IconTokensTests.swift`, `POS ADBDUITests/AnyRentE2ETests.swift` — the one tile
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/orders/v2/OrderActionsSheet.kt` — `ActionRow`
- `.../ui/orders/v2/OrderPhotoBlock.kt`, `.../ui/orders/v2/NoteEditorV2.kt`, `.../ui/orders/v2/OrderDetailV2Screen.kt` — the one tile
- `apps/client/app/orders/detail/photos.tsx` — the tile from 0 photos
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/ui/orders/v2/OrderActionsSheetIconsTest.kt` — mapping tests

## Risks

- Text is 32 pt narrower, so a long subtitle can wrap on a small phone. Check on iPhone SE.
- Merge with #1435: same Swift file, different section.

## Rollback

Revert the PR.
