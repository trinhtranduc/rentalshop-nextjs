# In-use Basic/Pro chips and tile clicks filter the list

Issue: #1194 · Author: owner · Status: accepted · Created: 2026-10-25

## Problem

#1192 put Basic/Pro/Enterprise on **Merchants** and counted every shop on that plan, including hết hạn. There is no stat for “Basic/Pro still in period”. Clicking a chip opens `/merchants?plan=Basic` with no `status=current`, so the list mixes expired shops and looks unfiltered. Tiles use `router.push` instead of real links.

## Proposed outcome

- **In use** chips = Basic / Pro / Enterprise among còn hạn. Click → `/merchants?status=current&plan=…`. List dropdown, rows, and `total` match.
- Tiles and chips are `<Link href>` so the URL always carries the filter.
- **Merchants** stays all shops, without plan chips.

## Affected users and systems

ADMIN / OPS, admin dashboard + merchants list. No POS. GET `/api/merchants` meaning unchanged.

## Constraints

Dual IDs. Admin English. Target `main-real`. No API shape change.

## Open questions

None.

## Decision log

- 2026-10-25 — Owner: need Basic/Pro still in duration; clicking stats must filter the merchant list.
