# Spec — Icons on the order actions sheet rows

Issue: #1438 · Status: done · Intent: ./intent.md

## Behavior

1. Icon per row (iOS SF Symbol / Android Material outlined): Print `printer` / Print; Notes `note.text` / Notes; History `clock.arrow.circlepath` / History; Edit `pencil` / Edit; Extend `calendar.badge.plus` / Event; Share `square.and.arrow.up` / Share; Cancel `xmark.circle` / Cancel; Delete `trash` / Delete.
2. Every icon has one size (about 20 pt) and one thin weight. Icons use the sheet's secondary text colour, except Cancel and Delete, which use the same red as their title. Row text keeps its colour.
3. The icon sits to the left of the title, centred on the title's first line, with a one-line or a wrapped title.
4. Title and subtitle share the same left edge, after the icon.
5. Titles, subtitles, row order, rows per role and actions are unchanged.
6. The icon is decorative: VoiceOver / TalkBack read the row as before, test ids and row labels are unchanged.
7. Hand-over photo block: one tile instead of the two buttons, the note editor's dashed "Thêm" tile (iOS `AddPhotoTile`, Android `AddTile`, same camera icon, 72 pt). Thumbnails sit beside it in one row, 72 pt, 12 pt apart. Same on web from 0 photos.
8. A tap on the tile opens the chooser: iOS Thư viện ảnh / Máy ảnh / Huỷ, Android the detail's existing camera / library dialog. Camera capture stays; the denied path still explains and offers Settings. On web the tile opens the file picker, as the note tile.
9. The × before confirm stays. At 3/3 the tile hides. The "Đủ 3 ảnh…" line is gone: the note editor has none.
10. The detail's own "Thêm" tile draws the same camera and keeps its look. The return sheet's read-only row and the failure warning show no camera icon, so they do not change.

## Out of scope

Any other screen's icon, the bottom bar, and the money section of order detail.

## API and data

No API change. No new strings.

## Acceptance

- [ ] 1: unit test on each platform maps every action to its icon; iOS also checks the symbol exists
- [ ] 2, 3, 4: screenshots on iPhone SE, a large iPhone and an Android AVD, as owner and as staff
- [ ] 7, 8, 9: unit test on each platform; `testPhotos01`, `testPhotos07` on iOS; adb on Android, camera denied included; web in a browser; screenshots
- [ ] 5, 6: `test5cOrderActionSheet` and `test8bStaffNoHistory` pass (they find rows by label); `uiautomator dump` on Android
- [ ] No new user-facing strings; no API path in the diff
