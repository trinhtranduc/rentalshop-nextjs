# Spec — Chosen rental days round trip

Issue: #573 · Status: in progress · Intent: ./intent.md

## Behavior

For a RENT order created with VN pickup day P and return day R:

1. `GET /api/orders/{id}` and `GET /api/orders/by-number/{n}`: VN day of `pickupPlanAt` = P, of `returnPlanAt` = R.
2. `GET /api/orders?status=RESERVED&startDate=P&endDate=P` (pickup-plan column) lists it; P−1 and P+1 do not.
3. `GET /api/calendar/orders/by-date?date=P` lists it; P−1, P+1 do not. After hand-over, `kind=return` on R lists it; R−1, R+1 do not.
4. `GET /api/calendar/orders/count?month&year` counts it on P (`countByDate`, `byDate.pickups`) and on no other day; after hand-over `byDate.returns` on R.
5. `POST /api/products/batch-availability` for each day P..R holds the unit (stock 1 → not available); P−1 and R+1 free. Old iOS UTC-day windows (`T00:00Z…T23:59:59.999Z`) give the same answer.
6. `GET /api/analytics/outlet-operations` lists it as a hand-over today when P = today.
7. `PUT /api/orders/{id}` with the same days keeps P and R.
8. Same results under process TZ=UTC and TZ=Asia/Ho_Chi_Minh.
9. Web: after creating through `/orders/create` by clicking P and R, the order page, Sửa đơn, orders list row,
   `/calendar`, `/availability` and `/dashboard` show P and R, in browser zones Asia/Ho_Chi_Minh, UTC, America/Los_Angeles.

Cases: same day, 1 night, cross-month (30/09→02/10), cross-year (31/12→01/01), pickup 00:00–06:59 VN and the
17:00Z boundary, 30 days, past, today.

## Out of scope

Fixing any bug found (separate issues). iOS/Android UI runs (`mobile-e2e-local`). SALE orders.

## API and data

None changed. Tests use numeric ids only.

## Acceptance

- [ ] Each behavior line has a case in `tests/e2e/TEST_CASES.md` (BF-RT-*, WEB-RT-*)
- [ ] Both suites run green (known bugs as `test.failing` with their issue number)
