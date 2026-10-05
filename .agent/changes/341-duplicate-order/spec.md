# Spec — One confirm creates one order

Issue: #341 · Status: in progress · Intent: ./intent.md

## Behavior

1. `POST /api/orders` runs "look for an existing order → insert" inside one transaction that first takes
   `pg_advisory_xact_lock(341, hash(outletId, customerId|walk-in, createdById))`. Concurrent creates for the
   same outlet + customer + staff run one after the other; other creates are not blocked.
2. **With `Idempotency-Key` header** (8–128 chars of `[A-Za-z0-9_-]`; anything else is ignored):
   the key is scoped to the calling user. If `OrderCreateKey(userId, key)` points at a live order, that
   order is returned. Otherwise the order is created and the key is stored in the same transaction.
   The identical-order window is not applied, so a new app can create two identical orders on purpose.
3. **Without the header** (installed apps, web): an order is a duplicate when it has the same outlet,
   customer (or both walk-in), creator, order type, total, pickup/return plan instants and the same
   multiset of (productId, quantity), was created less than 60 s ago, is not deleted and not `CANCELLED`.
   The duplicate is returned instead of inserting.
4. A returned (replayed) order gets HTTP 200, `code: ORDER_CREATED_SUCCESS`, the same `data` shape as a
   fresh create. Loyalty, audit "create", stock update and the push notification are skipped on replay
   (they already ran for the first request).
5. If the `OrderCreateKey` table does not exist (migration not applied yet), keyed requests fall back to
   behavior 3. Order create never fails because of the guard table.
6. iOS: Payment confirm fires once; Preview Save is disabled from the first confirm until the request
   fails (re-enabled) or succeeds (screen closes). Each Preview screen has one key, reused on retry.
   CartV2 CTA cannot push Preview twice.
7. Android: `submitOrder` returns early while `loading`; one key per checkout screen, reused on retry.

## Out of scope

- Web sending a key. Order update (`PUT`) idempotency. Payment endpoints.

## API and data

- Request: optional `Idempotency-Key` header. No body or response change.
- New table `OrderCreateKey (id, userId, key, orderId, createdAt)`, unique `(userId, key)`, index on
  `createdAt`. Additive; no change to `Order`.

## Acceptance

- [x] `tests/api/order-create-duplicate.test.ts`: two concurrent identical creates → one order; a retried
      create (same key, and same body without key) returns the same order id; two different orders sent
      together are both created; a keyed create with a new key creates a new identical order.
- [x] Existing `tests/api/*` stay green.
- [x] iOS and Android build; Android unit tests green.
- [x] Real Postgres check (scratch DB): 5 concurrent unkeyed creates → 1 order; 5 concurrent with one new key
      → 1 order; key table missing → savepoint rollback, window fallback.
- [ ] By hand on dev-api: double tap Confirm on iOS and Android → one order.
