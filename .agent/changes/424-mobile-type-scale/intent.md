# One type scale for the new mobile UI (larger list text)

Issue: #424 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

On the redesigned mobile screens (#363) the owner found list text too small and rows too tight: names and
totals 15–16, item lines and dates 12–13, pills and badges 10–11, line gaps 2–3, order rows 12 top/bottom.
Sizes are literal numbers spread across the screens, so iOS and Android drift and nobody can tell which
size a new label should use.

## Proposed outcome

- One ramp on every new-UI screen (flags `newOrders`, `newOrderDetail`, `newProducts`, `newCalendar`,
  `newOverview`, `newSettings`, `newAuth`, `newCustomers`), the same on iOS and Android:
  24/700 title · 20/700 money · 17/600–700 names, row totals, prices · 15 body, buttons, item line, field
  labels · 14 secondary (dates, order code, còn thu, stock, per-day price) · 12/600–700 pills, tags, badges,
  tab labels (minimum). Inputs and primary buttons stay 16, headings and hero numbers 18–30 stay.
- No 11 or 13 left on the new screens.
- Line gap inside a block 4–5; order row padding 15/16; product row padding 14 and min height 96.
- The ramp is a token set (`DS.TextSize` on iOS and Android); the new screens use it.

## Affected users and systems

All mobile roles on iOS (`apps/mobile`) and Android (`apps/mobile-android`), new screens only. No API change.

## Constraints

- Old screens (flags off) look exactly as before. Shared components keep their defaults.
- Dynamic Type / sp behavior stays as it is today (iOS new screens use fixed Inter sizes; Android uses sp).
- Long names still ellipsize; the status chip row may scroll; calendar day numbers fit.
- No other UI change.

## Open questions

- None. Source of truth: the design canvas (version 40), board "Hệ thống thiết kế" and the CHỐT boards.

## Decision log

- 2026-10-04 — Owner approved the ramp on the canvas; issue #424 opened (Trinh Tran)
- 2026-10-04 — Mapping rule used on the canvas is applied the same way in code (see `spec.md`)
