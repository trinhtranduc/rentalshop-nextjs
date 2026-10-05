# iOS truncated names and English plurals

Issue: #430 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-05

## Problem

The #391 e2e run (iOS, English) showed:

- Order rows cut the customer name short ("Kevin…", "Nguyễn V…") although the row has room.
  It happens on rows that show a pay line ("✓ paid in full", "to collect 61") and a short item line.
- The order detail title cuts long order numbers ("#ORD-003-0…").
- English counts say "1 days", "1 orders", "Cart · 1 items".

## Proposed outcome

- A row shows the whole name whenever it fits beside the tag and the money column.
- The order detail title shows the whole order number (it shrinks down to 70% instead of cutting).
- English says "1 day", "1 order", "Cart · 1 item"; Vietnamese is unchanged.
- Android: the same plurals are fixed (Android uses `<plurals>`).

## Affected users and systems

All merchant roles. iOS (new orders tab, order detail, products home/cart) and Android (same screens).
No API change.

## Constraints

- Keep the fix small; only the new-UI screens. Do not change the type scale (#424 is separate).
- Follow the #388 pattern on iOS: a singular key next to the plural key, chosen in code.

## Decision log

- 2026-10-05 — iOS uses a `.one` key next to each base key (the #388 approach, no `.stringsdict`) (agent)
