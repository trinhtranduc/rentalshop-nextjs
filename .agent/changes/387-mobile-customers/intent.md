# Mobile onboarding and customers (round 2, phase 6)

Issue: #387 · Part of #385 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The approved boards Onboarding, KH-chon, KH-moi, KH-ds and KH-chi-tiet (canvas DY4DRyDH8Kps9gAw9FExLx) have no
code. The new cart (#373) still opens the old customer picker, iOS has no customer list at all, and neither app
stops a second customer being created with a phone that already exists.

## Proposed outcome

- With `newAuth` on, the first launch after login shows a 3-step onboarding in the board's style (same "show once"
  storage as today).
- With `newCustomers` on, the new cart opens a picker sheet (search, "Khách mới", "GẦN ĐÂY"); a new-customer form
  needs phone and name, offers an existing customer with the same phone instead of creating a duplicate, and
  returns to the cart with the customer selected.
- Settings opens a customer list (iOS gains the row; Android routes its row) and a customer detail with tier, call,
  three tiles, recent orders and "Tạo đơn cho khách này".
- With either flag off, the current screens are unchanged.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. No API change; existing endpoints only:
`GET /api/customers?q=`, `POST /api/customers`, `GET /api/customers/{id}/orders`, `GET /api/orders?customerId=&status=`.

## Constraints

- Flags off: old onboarding, old picker, old customer screens untouched.
- Selecting a customer sets the cart customer exactly as the old picker does.
- OUTLET_STAFF may create customers and never sees delete.
- Days in the device time zone; money with `MoneyFormatter` / `formatMoneyVnd`.

## Open questions

- None.

## Decision log

- 2026-10-04 — Boards marked CHỐT; issue #387 opened under the round 2 plan #385 (Trinh Tran)
