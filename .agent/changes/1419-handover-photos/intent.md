# Return sheet shows the hand-over photos (phones)

Issue: #1419 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

At return the shop needs to compare the goods with their condition at hand-over. The photos are on the order detail, not on the "Nhận trả đồ" sheet.

## Proposed outcome

The return sheet on iOS and Android shows the hand-over photos, read only, tap to view large.

## Constraints (owner's final decisions)

- No photo capture at return: no add control, no `returnNotesImages` upload, no return queue.
- A return with no hand-over photos: no block, the sheet is as today, including its height.
- Existing `returnNotesImages` keep showing wherever they already do.
- Same row as the order detail: "Ảnh khi giao · N", the same words and style.
- No change under `apps/api`, `prisma` or API packages. Money, buttons and titles stay.

## Decision log

- Photos still waiting on the device show too, faded, as on the detail: they are the same evidence.
- With photos the iOS sheet opens at large, as the hand-over sheet does; without them it stays at medium.
