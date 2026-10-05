# Spec — hand-over date sort puts NULLs last

Issue: #428 · Status: approved · Intent: ./intent.md

## Behavior

1. `GET /api/orders?sortBy=pickupPlanAt&sortOrder=asc|desc` orders by `pickupPlanAt` with NULLs last.
2. Same for `sortBy=returnPlanAt` (the other nullable date the query schema allows).
3. Other `sortBy` values (`createdAt`, `orderNumber`, `status`, `totalAmount`, `nearestTask`) keep
   their current ordering. Default stays `createdAt desc`. Merchant scoping is unchanged.

## API and data

No shape change. Only the order of rows for the two nullable sort keys.

## Out of scope

`/api/orders/cursor` keyset pagination on nullable keys.

## Acceptance

- [ ] `tests/api/orders-sort-pickup-nulls-last.test.ts` fails before the fix, passes after
