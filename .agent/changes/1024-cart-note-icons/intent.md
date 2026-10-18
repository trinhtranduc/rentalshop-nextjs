# Cart: icons for "Thêm món" and "Ghi chú"

Issue: #1024 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-17

## Problem

The mobile cart shows text-only controls ("+ Thêm", "+ Ghi chú", "Ghi chú · Thêm ›"). They read as plain
text and are easy to miss on a busy cart.

## Proposed outcome

Owner-approved option A (icon + word), mockup tab "Giỏ: icon Thêm món · Ghi chú"
(https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4):

- MÓN header: plus-circle icon + "Thêm" (blue).
- Item note: pencil icon + "Ghi chú" (grey); with a note: pencil + the note on one line, cut with "…".
- Order note row in TIỀN: note icon at the start of the row.

## Affected users and systems

All roles using the cart on iOS (`apps/mobile`) and Android (`apps/mobile-android`). No API, no data.

## Constraints

Display only. Taps open the same screens. VoiceOver/TalkBack read "Thêm món", "Ghi chú" and the note.
iOS is the reference. Cost rows (#1010) untouched.

## Open questions

- None.

## Decision log

- 2026-10-17 — Option A (icon + word) chosen (owner).
- 2026-10-17 — Order note row keeps its title "Ghi chú" (no new "Ghi chú đơn" string); only the icon is added (agent, minimal scope).
