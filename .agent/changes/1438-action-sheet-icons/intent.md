# Icons on the order actions sheet rows

Issue: #1438 · Author: Trinh Tran · Status: done · Created: 2026-11-01

## Problem

The "Thao tác với đơn" sheet on order detail is text only (#930), so rows are hard to tell apart at a glance.

## Proposed outcome

Every row of the sheet shows a small icon to the left of its title, on iOS and Android. Nothing else about the rows changes.
In the hand-over sheet the two photo buttons (camera, library) become one tile, the note editor's dashed "Thêm" tile, with the thumbnails beside it.

## Affected users and systems

Everyone who opens ⋯ on order detail (owner, branch manager, staff, inventory). iOS and Android. No API.

## Constraints

- Titles, subtitles, order, which rows show per role, and every action stay as they are. No chevrons exist today and none are added.
- No new strings, no API path touched.
- Diff stays inside the sheet: `feat/1435-order-money-compact` is changing the money section of the same Swift file.

## Open questions

None.

## Decision log

- 2026-11-01 — Owner approved icons on this sheet; this replaces #930 spec line 3 "Sheet rows have no icons" (owner).
- 2026-11-01 — Icons have no colour: one neutral colour, one size, one weight, standard system icons. Row text unchanged (owner: "icon không cần màu sắc, theo tiêu chuẩn, đừng rối").
- 2026-11-01 — Exception: the Cancel icon is red, the same red as its text (owner: "hủy có thể đỏ"). Delete is the same kind of dangerous row with red text, so its icon is red too, for consistency; the coordinator told the owner, who can reverse that one (coordinator).
- 2026-11-01 — Owner approved the sheet with red Cancel and Delete icons ("chốt phần sheet"). Same PR: the hand-over photo block uses the note editor's camera icon (owner, through the coordinator).
- 2026-11-01 — Owner clarified: one single camera tile like the note editor instead of the two buttons; it opens the camera / library chooser, so hand-over keeps camera capture (owner, through the coordinator).
- 2026-11-01 — The note editor has no "Đủ 3 ảnh…" line, so the hand-over block drops it: at 3/3 the tile hides and the count says 3/3 (coordinator's rule, applied by the agent).
- 2026-11-01 — Android Notes uses `Icons.AutoMirrored.Outlined.Notes`: the `Outlined.Notes` name is deprecated in the app's Compose BOM and the app already takes arrows from `automirrored.outlined`. Same glyph (agent).
