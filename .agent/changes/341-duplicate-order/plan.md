# Plan — One confirm creates one order

Issue: #341 · Status: in progress · Spec: ./spec.md

## Steps

1. Failing test `tests/api/order-create-duplicate.test.ts` (route + real `packages/database/src/order.ts`
   over an in-memory Prisma fake that honours advisory locks). Commit alone (`bug-fix-tdd`).
2. `prisma/schema.prisma` + `prisma/migrations/20261005120000_order_create_key/` — `OrderCreateKey` (`db-migration`).
3. `packages/database/src/order-create-guard.ts` — lock key, item signature, `createOrderOnce`; exposed as
   `db.orders.createOnce`.
4. `apps/api/app/api/orders/route.ts` — read `Idempotency-Key`, call `db.orders.createOnce`, skip side effects
   on replay (`api-route-standard`).
5. iOS: `PaymentCollectionViewController` latch; `PreviewViewController` in-flight flag + disabled Save;
   `CartViewModel.createIdempotencyKey`; `OrderService` sends the header; `CartV2ViewController` push guard.
6. Android: `ApiClient.createOrder(idempotencyKey)`, `CartCheckoutScreen` guard + key, legacy
   `HomeScreens` checkout guard (`mobile-parity`).
7. Verify: `cd tests && npx jest api/`; `npx tsc --noEmit -p apps/api/tsconfig.json`; iOS and Android builds.

## Files

- `tests/api/order-create-duplicate.test.ts` — reproduction
- `prisma/schema.prisma`, `prisma/migrations/20261005120000_order_create_key/migration.sql` — key table
- `packages/database/src/order-create-guard.ts`, `order.ts`, `index.ts` — guarded create
- `apps/api/app/api/orders/route.ts` — use it
- iOS: `PaymentCollectionViewController.swift`, `PreviewViewController.swift`, `CartViewModel.swift`,
  `OrderService.swift`, `CartV2ViewController.swift`
- Android: `data/ApiClient.kt`, `ui/home/CartCheckoutScreen.kt`, `ui/home/HomeScreens.kt`

## Risks

- Old apps / web: an intentional identical order within 60 s (same customer, items, total, dates, staff)
  now returns the first order. Accepted trade-off; new apps send a key and are exempt.
- Migration fails on deploy → probe finds no table → keyed requests use the window. Create still works.
- Replay after a loyalty-redeem rollback of the first order could return a deleted order (both taps +
  redeem failure). Very unlikely; the first request already reports the error.

## Rollback

Revert the PR. The `OrderCreateKey` table can stay (unused) or be dropped by a later migration.
