# Spec — Cart: icons for "Thêm món" and "Ghi chú"

Issue: #1024 · Status: in-progress · Intent: ./intent.md

## Behavior

1. MÓN header trailing control shows the add icon (iOS `plus.circle`, Android `Icons.Outlined.AddCircleOutline`) + "Thêm", primary blue; tap opens the product picker as before. Screen readers read "Thêm món".
2. A line with no note shows the pencil icon (iOS `square.and.pencil`, Android `Icons.Outlined.Edit`) + "Ghi chú" in grey.
3. A line with a note shows the pencil icon + the note on one line (line breaks become spaces), truncated with "…"; tap opens the same "Ghi chú món" sheet.
4. Screen readers read the item note as now: "Ghi chú cho <product>" plus the note text when there is one.
5. The order note row in TIỀN shows the note icon (iOS `note.text`, Android `Icons.Outlined.Description`) before "Ghi chú"; value and tap unchanged.

## Out of scope

API, cart flow, note editors, cost rows (#1010), other screens.

## API and data

None.

## Acceptance

- [x] Each behavior line has a unit test (logic) or a build/UI check named in `plan.md`
- [x] iOS and Android both changed
- [x] New strings: one accessibility string "Thêm món" / "Add item" (the mobile apps ship en + vi only)
- [x] No money, day or role rule touched
