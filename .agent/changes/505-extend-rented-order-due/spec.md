# Spec — #505

1. New nullable column `Order.pickupTotalAmount` (migration, additive). Set to the total at the moment the order becomes PICKUPED (`updateOrder`: the `totalAmount` of that same PUT, else the stored one; `createOrder` when created PICKUPED). Null (every existing order, RESERVED, SALE) = nothing recorded, treat `totalAmount` as collected.
2. Extension = `totalAmount - pickupTotalAmount` (0 when null). A negative value (the total was lowered after hand-over) is money to give back.
3. `computeOrderBalance`, PICKUPED: `net = damageFee + lateFee + extension - securityDeposit - RETURN_ADJUSTMENT payments`. `amountDue = max(0, net)`, `refundDue = max(0, -net)`. Identical to today when extension is 0.
4. `getOrderRevenueEvents` (and `getFutureRevenueEvents`, `getOrderRevenueForDate`, `calculateOrderRevenueByStatus`):
   - pickup event uses `pickupTotalAmount ?? totalAmount` (the pickup day never moves after the fact);
   - return event (different day) = `fees + extension - securityDeposit`: the extra rent is booked on the return day, where it is settled (same day the balance says it is due);
   - cancel after pickup refunds what was collected: `pickupTotal + securityDeposit (+ deposit)`;
   - same-day rent+return unchanged (uses `totalAmount`).
5. Every analytics query that feeds these functions selects `pickupTotalAmount` and passes it (outlet operations, income, income/daily, income/orders, top customers, dashboards, period report, income period summary, orders list, calendar rows).
6. Response: `pickupTotalAmount` is an extra key on order rows and on the `PUT /api/orders/{id}` response (null when not recorded). Old apps ignore it.
7. Not changed: `totalAmount`, `amountDue`, `refundDue` for orders without a pickup total (all orders handed over before the deploy, RESERVED, SALE); stock; apps.

Known limits (owner review): any later change of `totalAmount` of a handed-over order (discount, price edit) counts as an extension; old Android/iOS compute the return amount on the detail/return screen themselves (`OrderDetailLogic.kt`, `OrderViewModel.swift:876`) and ignore the extension until updated; orders extended before this deploy keep the old numbers.
