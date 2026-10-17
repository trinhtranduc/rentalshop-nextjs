# Date chips: icons instead of "Lấy" / "Trả"

Issue: #1008 · Author: Claude (for Trinh Tran) · Status: accepted · Created: 2026-10-17

## Problem

The #891 option C date chips read "Lấy 14/10/26" / "Trả 16/10/26". The words take width on a narrow row; the chip colour already says which date it is.

## Proposed outcome

The word is replaced by an icon in the chip's text colour: pickup = arrow going out (iOS `arrow.up.forward`, Android `ArrowOutward`), return = arrow coming back (iOS `arrow.uturn.backward`, Android `AutoMirrored.Outlined.Undo`). Screen readers still read "Lấy 14/10/26" / "Trả 16/10/26".

## Affected users and systems

All shop roles using the iOS and Android apps: order rows, the Việc cần làm task date chip, calendar day rows. No API, web or data change.

## Constraints

Keep chip colours, date text, sizes, the "sorted date is bold" rule and chip order. No "less colour" redesign. iOS is the reference.

## Open questions

- None.

## Decision log

- 2026-10-17 — replace the words with icons, keep everything else (owner)
