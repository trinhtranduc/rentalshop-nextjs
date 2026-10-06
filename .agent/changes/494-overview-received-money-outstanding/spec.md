# Spec — #494

## API (additive)
`GET /api/analytics/period`
- `revenue.collateralFlow { received, returned }`: collateral received at pickup and handed back at
  return or cancellation, by the instant money moved, inside the period. A same-day rent+return moves no
  collateral. `received - returned` = `totalRevenue - collected` of the same events.
- `revenue.outstandingBreakdown { atPickup: { amount, orders }, overduePickup: { amount, orders } }`:
  splits `outstanding` of orders created in the period. Rent RESERVED with `pickupPlanAt` before the start
  of today (Vietnam) is overdue; everything else (incl. unfinished sales, no plan date) is at pickup.
  `atPickup.amount + overduePickup.amount = outstanding`.

`GET /api/analytics/outlet-operations` (cash section, managers only)
- `cash.collateralToCollect { securityDeposit, orders }`: rent RESERVED orders with collateral > 0.

## Mobile (iOS + Android)
- Thực thu sheet → "Tiền thực nhận": headline = collected + received − returned (shown only when
  `collateralFlow` exists, else the old sheet). Two collapsible rows: Thực thu (breakdown lines) and
  Thế chân (đã nhận / đã trả lại). Box "Thế chân sắp tới · chưa tính vào số nào": Sẽ trả lại khách
  (`depositsHeld.securityDeposit`, orders) and Sẽ nhận khi giao đồ (`collateralToCollect`).
- Còn phải thu tile opens a sheet: Sẽ thu khi khách lấy đồ / Quá ngày lấy, chưa thu (amount + order
  count), total. Only tappable when `outstandingBreakdown` exists.
- Thực thu tile sub-line becomes "Không gồm thế chân".
