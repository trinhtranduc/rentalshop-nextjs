# Mobile order detail (rental, sale, hand-over, return, notes)

Issue: #372 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

Order detail on mobile is one long form (iOS `PreviewViewController`, Android `OrderDetailScreen`) with every
field and button at the same weight. Staff cannot see at a glance what to do next, how much to collect at
hand-over, or how much to give back at return. Late returns are not called out.
Android also has two bugs on the current screen: a rejected status change shows nothing, and removing a note
photo never reaches the API (`existingNoteImageUrls` is unused).

## Proposed outcome

With the `newOrderDetail` app-config flag on, opening an order shows the canvas design (artifact
DY4DRyDH8Kps9gAw9FExLx, boards CT-gon, CT-qua-han, CT-ban, Giao-do, Nhan-tra, CT-sua): one primary action per
status, hand-over and return sheets that show the API money rule, a "Trễ N ngày" note, notes with up to 5
photos. Editing an order keeps the current cart flow. With the flag off nothing changes, except the two
Android fixes above.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. Uses `GET /api/orders/:id`,
`PUT /api/orders/:id` (status, lateFee, damageFee, notes, notesImages) and, on Android only as today,
`POST /api/payments/process`. No API change.

## Constraints

- Installed apps and users without the flag keep the current screens.
- Late is a note, not a status. Days in the device time zone.
- Money follows `apps/api/lib/order-balance.ts` (`computeOrderBalance`).
- Status changes go through the existing endpoint; the API guard (`ORDER_STATUS_TRANSITIONS`) decides.
- No new API fields.

## Open questions

- None.

## Decision log

- 2026-10-04 — Plan accepted; stacked on #371 (Trinh Tran)
- 2026-10-04 — Edit order reuses the current cart edit flow; notes are edited from the detail screen (agent)
- 2026-10-04 — The 5-photo limit applies to the new screen; the old screens keep their limit (3) (agent)
