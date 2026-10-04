# Mobile icon sizes and style match the boards

Issue: #396 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

Icons on the redesigned mobile screens (#371–#374, #383) render larger and heavier than the canvas boards
(camera, scan and bell on Home are the most visible):

1. iOS uses `UIImage.SymbolConfiguration(pointSize:)` with the board's px value. A symbol point size is a font size,
   so the glyph comes out 20–40% larger than the board's icon, whose number is the icon box.
2. Some icons have no size: the iOS bell and magnifying glass, the Android top-bar + and bell (24dp default).
3. Android uses filled Material icons where the boards use 2px outline icons, and a QR glyph for the barcode scan.

## Proposed outcome

- Both apps have icon size tokens `sm` 18, `md` 20, `lg` 22 (board px = icon box).
- iOS has one helper that maps a board size to an SF Symbol point size (measured factor) with a medium weight.
- Android uses `Icons.Outlined.*` at the same dp; the scan icon is a barcode drawn from the board's SVG path.
- Every icon on the new screens uses a token (or the board's own number when it is not 18/20/22).
- Screens behind flags that are off are unchanged.

## Affected users and systems

All mobile roles on iOS and Android, only on screens behind `newOrders`, `newOrderDetail`, `newProducts`,
`newCalendar`, `newOverview`, `newSettings`. No API change.

## Constraints

- Old screens (flags off) must not change. Shared components get an optional parameter, defaulting to today's value.
- Tab bar and system bars are out of scope (shared shell, not behind a flag).

## Open questions

- None.

## Decision log

- 2026-10-04 — Issue #396 opened as part of #385 (Trinh Tran)
