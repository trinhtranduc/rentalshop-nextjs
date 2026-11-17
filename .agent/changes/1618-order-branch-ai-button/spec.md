# Spec — Branch in order detail and AI button top right (apps)

Issue: #1618 · Status: in-progress · Intent: ./intent.md

## Behavior

1. Order detail shows a branch line (store icon + `outlet.name`) when the user is MERCHANT, the shop has 2+ active branches, and the name is not blank.
2. No branch line for a one-branch shop, for OUTLET_ADMIN / OUTLET_STAFF / OUTLET_INVENTORY, or when the name is blank.
3. The branch line sits in the status box, above "Tạo bởi …" (or last when there is no creator).
4. Tổng quan: the AI button is in the title row, after the date, at the right edge; shown only when GET weekly-summary says `available` (unchanged); red dot unchanged; tapping opens the same sheet.
5. Tổng quan: no extra bottom space for a floating button.

## Out of scope

Web (already has both). The API. Monthly summary.

## API and data

None. iOS `OrderDetail.outlet.name`, Android `OrderDetail.outletName` are already parsed.

## Acceptance

Unit tests for the show rule on both apps; iOS and Android build; screenshots of order detail (2-branch owner, staff) and Tổng quan with the button on Simulator and emulator.
