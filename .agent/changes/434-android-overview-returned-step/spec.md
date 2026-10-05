# Spec — Android overview "New orders" title and returned step bar

Issue: #434 · Status: approved · Intent: ./intent.md

## Behavior

1. `OverviewLinks.listTitle("new")` is `R.string.overview_v2_new_orders` ("New orders"), not "New rentals".
   Other kinds keep their titles.
2. `OrderDetailLogic.progressDays(summary)` returns booked = `createdAt`, hand over =
   `pickedUpAt ?: pickupPlanAt`, return = `returnedAt ?: returnPlanAt` (iOS `progressView`).
3. A RETURNED order with `returnedAt` 2026-10-04T18:30Z (05/10 in Vietnam) and plan 08/10 shows "05/10".
4. `pickedUpAt` and `returnedAt` are read from the order JSON (optional; null on older payloads).

## Out of scope

The list content (it already matches the card), the Net income formula (API), iOS.

## API and data

None. `GET /api/orders/:id` already returns `pickedUpAt` / `returnedAt`.

## Acceptance

- [x] Each behavior line has a unit test (`OverviewLinksTest`, `OrderDetailLogicTest`)
- [x] iOS unchanged: it already behaves this way
- [x] No new strings
- [x] Vietnam day at the 17:00Z boundary covered in tests
