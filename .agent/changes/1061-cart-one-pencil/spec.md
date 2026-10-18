# Spec — Cart: one pencil for every edit

Issue: #1061 · Status: approved · Intent: ./intent.md

## Behavior

0. The icon is the mockup's (`cartmoney.html`) Lucide "pen-line": 24×24 viewBox, stroke 2.2, round caps and joins,
   no fill, paths `M12 20h9` and `M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z` (owner: "icon đúng mockup"). iOS
   targets 15.0, so SF `pencil.line` (iOS 17) is not used: `DS.editIcon(size:)` draws the paths as a template image.
   Android: `AppIcons.EditLine` (`ImageVector` from the same paths).
1. `CartV2Icon` has `addItem` (`plus.circle`) and `edit` (`pen-line`); `itemNote` and `orderNote` are the same `edit`.
   Android `CartV2Icon`: `ADD_ITEM` and `EDIT` (`EditLine` / `pen-line`); `ITEM_NOTE` and `ORDER_NOTE` are `EDIT`.
2. The pencil of a TIỀN edit row and of an item note line come from one helper (iOS `V2.editPencil()` →
   `DS.editIcon(size: 16)`, Android `CartEditIcon` / `CartEditIconSize` 16dp), tinted primary blue.
3. Item note line, empty: "Ghi chú" in bold primary blue, then the pencil. Filled: the note (wrapped, #334155) in the
   light box, then the pencil on its first line. No leading icon.
4. The order note row keeps title, value, camera + count, pencil. No `note.text` / `Description` anywhere in the cart.
5. Taps, sheets, VoiceOver / TalkBack text unchanged.

## Out of scope

Other screens' edit icons (order detail, customers, settings).

## API and data

None.

## Acceptance

- [x] 0–2: unit tests (`ProductsV2Tests.testCartUsesOnePencil`, `CartNoteIconsTest.iconsMatchIos`, `CartEditIconTest`)
- [x] 3–4: simulator screenshot
- [x] iOS and Android both changed
- [x] No new strings
