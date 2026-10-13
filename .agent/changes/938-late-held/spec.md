# Spec #938

## API (additive)
`GET /api/analytics/outlet-operations?collateralHeld=1`: when the caller sees money (`analytics.view.revenue`), the
response gets `collateralHeld: { count, orders }` — RENT, PICKUPED, `securityDeposit > 0`, in scope, by
`returnPlanAt` asc, up to 500 rows (same row shape as the other lists, `securityDeposit` included). Same `where` as
`cash.collateralToReturn`, so `count === cash.collateralToReturn.orders`. Without the flag or without money: the field
is absent / `null`. No existing field changes.

## Calendar (iOS, Android)
- Selected day == today: rows = hand-overs, returns of today, then `overdueReturns.orders` of outlet-operations
  (same outlet filter) not already listed, as return rows; each late row's "Trễ N ngày" uses the row's `lateDays`.
- Other days unchanged. A failed late request leaves today's list as before (no error state).

## Overview Thế chân (iOS, Android, web)
- Chip count = `cash.collateralToReturn.orders` (missing on an older API → the old `depositsHeld.orders`).
- Related list (kind collateral): held rows first (order, customer, "Đang giữ thế chân", amount = securityDeposit),
  then the period's in/out rows. The footer total and its count stay the period rows only (= the tile).
- New string `…related.note.held` / `overview.related.collateralHeld` in every locale.

## Tests
- jest: database list + count, route flag, web `buildTiles` chip, web held rows / total.
- iOS + Android unit: calendar merge of late rows (TZ UTC and Asia/Ho_Chi_Minh), chip count, held rows / total.
