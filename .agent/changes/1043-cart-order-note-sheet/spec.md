# Spec — Cart order note opens the same sheet as the item note

Issue: #1043 · Status: approved · Intent: ./intent.md

## Behavior

1. In the TIỀN section the order note is an entry styled like the item note line: the order-note icon + "Ghi chú đơn"
   (grey, bold) when empty; the icon + the note on one line (line breaks become spaces, cut with "…") in a light box
   when filled. With photos (create mode) a camera icon + the count follows.
2. Tapping it opens `CartItemNoteSheet` (iOS) / `CartItemNoteSheet` (Android) with title "Ghi chú đơn", the order
   placeholder and hint, the current note prefilled, ✕, "Xoá ghi chú" (only when there is a note) and "Lưu". The
   keyboard opens on show, as in the item sheet.
3. Create mode: the sheet has a photo row (existing photos, × to remove, "Thêm" while fewer than 5). Edit mode: no
   photo row (`CartV2Logic.orderNoteMaxPhotos(editMode:)` = 0), as before.
4. "Lưu" stores the trimmed note (blank = no note) and, in create mode, the photos; "Xoá ghi chú" clears the text
   and keeps the photos; ✕ or a swipe down changes nothing.
5. The create request (`notes` + note images) and the edit request are unchanged.

## Out of scope

The order detail note editor (`OrderNotesEditorViewController` / `NoteEditorV2`) is unchanged.

## API and data

None.

## Acceptance

- [x] 1, 3: unit tests (iOS `ProductsV2Tests`, Android `CartNoteIconsTest`)
- [x] 1–4: simulator screenshots (empty, filled, sheet open)
- [x] New strings in en + vi (the only locales of both apps)
- [x] No API shape or business rule change
