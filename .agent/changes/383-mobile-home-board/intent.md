# Mobile Home product list matches the approved board

Issue: #383 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The new Home (`newProducts`, #373) differs from the approved board "CHỐT · Danh sách sản phẩm" (`SP-dong`):
it has category chips, the image-search and barcode buttons sit outside the search field, the row shows the
category next to the code, the + button never says how many of a product are already in the cart, and the cart
bar is black.

## Proposed outcome

With `newProducts` on, iOS and Android show the board's layout: no category chips, the two icon buttons inside the
search field, a "code ● stock" line, a + button that shows the cart quantity, and a blue (`#1D4ED8`) cart bar.
With the flag off the old Home is unchanged.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. No API change (the list simply stops sending
`categoryId`).

## Constraints

- Flag off: old Home untouched.
- Prices on the row stay as they are; tapping + still adds one; out today stays grey.
- The count comes from the existing cart stores and updates live. No stepper on the list.

## Open questions

- None.

## Decision log

- 2026-10-04 — Board SP-dong approved; issue #383 opened as a follow-up to #373 (Trinh Tran)
