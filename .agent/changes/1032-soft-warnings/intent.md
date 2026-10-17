# Late and not-prepared warnings without a coloured box

Issue: #1032 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-17 · Follows: #1026 / PR #1027

## Problem

After #1027 the date chips are grey, so the pink "Trễ N ngày" and orange "Chưa soạn đồ" boxes are now the
loudest thing on an order row, louder than the status badge.

## Proposed outcome

On every mobile order row, the two warnings are small coloured text with a small icon and no box:
late = red with a clock, not prepared = orange with a box. The status badge stays the strongest colour.

## Constraints

- Owner-approved mockup: tab "Mọi màn đơn hàng: cảnh báo gọn" (artifact 9b56KwErJWiGpiyFEfyEY4).
- iOS is the reference; Android matches.
- VoiceOver / TalkBack read the same text as before.
- No change to when a warning shows. No API change.
- Keep: status badges, grey date chips (#1027), "còn thu", "Sẵn sàng giao", order detail, and other screens
  that use `DS.Status.late` / `.waiting`.
