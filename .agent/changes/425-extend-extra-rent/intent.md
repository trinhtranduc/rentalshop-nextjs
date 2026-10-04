# Gia hạn lets staff enter the extra rent

Issue: #425 · Follows #390 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

"Gia hạn" (#390) on iOS and Android only moves `returnPlanAt`. The order keeps its old total and its old
`rentalDuration`, so after an extension the detail shows the old day count, the old total, and a "còn thu" that
misses the extra days. Today the counter has to edit the whole order in the cart to charge for them.

## Proposed outcome

- The Gia hạn sheet has a money field "Tiền thuê thêm" (en "Extra rent"), empty by default, digits only, shown with
  dot grouping and no currency symbol.
- When the extra is above 0 the sheet shows "Tổng mới: X" (old `totalAmount` + extra) under the field.
- Save sends `PUT /api/orders/{id}` with `returnPlanAt` (as before), `rentalDuration` (the new inclusive day count,
  pickup day → new return day, same count the cart and the detail use) and `totalAmount` = old total + extra only
  when extra > 0.
- After the save the order detail shows the new total, the new "còn thu" and the new day count.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` with `orders.update`, on iOS and Android (`newOrderDetail`).
No API change: `totalAmount` and `rentalDuration` are already in the order update whitelist
(`packages/database/src/order.ts`).

## Constraints

- No API change; no change to deposit or discount.
- Days are device-zone days (same as #390 and the cart); the return day ends at its last second.
- Behind `newOrderDetail` like the rest of the sheet; old screens untouched.
- Strings in en + vi (the only locales the apps ship).

## Open questions

- None.

## Decision log

- 2026-10-04 — When a rental is extended the staff types the extra rent; the API does not reprice (owner).
- 2026-10-04 — `rentalDuration` is sent on every extension (also with extra 0) so the day count follows the new
  return day (agent, from the issue).
