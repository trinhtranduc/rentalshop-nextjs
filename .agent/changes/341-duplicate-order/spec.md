# Spec — One confirm creates one order

Issue: #341 · Status: in progress · Intent: ./intent.md

## Behavior

1. **With an `Idempotency-Key` header** (8–128 chars of `[A-Za-z0-9_-]`; anything else is ignored and
   treated as no key): `POST /api/orders` runs "look up `OrderCreateKey(userId, key)` → else insert the
   order and store the key" in one transaction that first takes
   `pg_advisory_xact_lock(341, hash(userId, key))`. A second in-flight or retried create with the same
   key from the same user waits, then gets the first (live) order. Another user's same key is unrelated.
2. **Without a key** (installed apps, web): a plain create, exactly as before. No lock, no lookup, no
   time window; identical requests create identical orders (owner decision 2026-10-05).
3. (removed: 60 s identical-order window)
4. A returned (replayed) order gets HTTP 200, `code: ORDER_CREATED_SUCCESS`, the same `data` shape as a
   fresh create. Loyalty, audit "create", stock update and the push notification are skipped on replay
   (they already ran for the first request).
5. If the `OrderCreateKey` table does not exist (migration not applied yet), the lookup rolls back to a
   savepoint and the order is created without the key (no dedupe). Create never fails because of it.
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

- [x] `tests/api/order-create-duplicate.test.ts`: no key → concurrent and repeated identical creates each
      create an order; one key → one order under concurrency; retry with the key → same order; new key,
      other user's key, malformed key → new order; key table missing → create still succeeds.
- [x] Existing `tests/api/*` stay green.
- [x] iOS and Android build; Android unit tests green.
- [x] Real Postgres check (scratch DB): 5 concurrent creates without a key → 5 orders; 5 concurrent with one
      key → 1 order (4 replays); retry with the key → same order; key table missing → order created.
- [ ] By hand on dev-api: double tap Confirm on iOS and Android → one order.
