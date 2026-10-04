# Android: cart saves the return day as 23:59 UTC

Issue: #413 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

Both Android carts (the old one and `CartV2`, which reuses the old checkout screen) send
`pickupPlanAt = <pickup>T00:00:00Z` and `returnPlanAt = <return>T23:59Z`. Those are UTC day
boundaries. On a phone in Vietnam an order booked 04/10 → 05/10 is stored as 04/10 07:00 → 06/10
06:59 local, so detail screens, availability and late days are one day off at the end (and the
pickup starts at 07:00 instead of 00:00).

Loading an order back into the cart for edit reads the first 10 characters of the ISO string
(the UTC day), so once the send side is right, edit would shift both days back by one.

## Proposed outcome

For the same chosen days, Android sends the same instants iOS sends: pickup = start of the pickup
day in the device time zone, return = the last second of the return day in the device time zone,
as UTC ISO strings with milliseconds. In Vietnam, 04/10 → 05/10 becomes
`2026-10-03T17:00:00.000Z` → `2026-10-05T16:59:59.000Z`. Loading the order back into the cart
gives 04/10 → 05/10 again.

## Affected users and systems

All roles that create or edit rent orders on Android. No API, iOS or web change.

## Constraints

- No API change, no data migration (owner's go needed; report only).
- Tests run with the default zone set to `Asia/Ho_Chi_Minh` and to `UTC`, around midnight.
- Another agent (#388) works on `CartStore` auto-deposit logic; touch only the date lines.

## Open questions

- None.

## Decision log

- 2026-10-04 — Boundary = iOS `Date.startOfDay()` / `Date.endOfDay()` in the device zone
  (`TimeZone.current`), sent via `dateServerISOString()`; the web create form uses local
  `T23:59:59` too. The API stores the instant as given.
- 2026-10-04 — The cart availability window (batch check and its single-check fallback) uses the
  same two instants, as iOS `CartV2ViewController` does, so the check covers the stored period.
