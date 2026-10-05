# orders: one Save / Confirm created two orders

Status: active · Added: 2026-10-05 · Source: #341

## Failure

- iOS payment confirm had no latch and Preview kept Save enabled while the create was in flight, so one
  confirm could send `POST /api/orders` twice. Android `submitOrder` had no re-entry guard either.
- `POST /api/orders` had no way to recognise a retried or doubled create. A check-then-create duplicate lookup
  (closed PR #342) still races.

## Detect

```bash
cd tests && yarn test api/order-create-duplicate
```

## Pass

Two concurrent creates with the same `Idempotency-Key` (same user) produce one order and both responses carry its
id; a retry with the key returns it. Requests without a key create orders exactly as before (no time window, owner
decision 2026-10-05). The key lookup and the insert run in one transaction under `pg_advisory_xact_lock` per
(user, key) (`packages/database/src/order-create-guard.ts`).

## Notes

Installed apps send no key and are protected only after users update. A create path that skips
`db.orders.createOnce`, or a client create that drops the key, brings the bug back. Do not reintroduce
content-based duplicate matching without an owner decision. Mobile CTAs that create must ignore taps while a request is in flight.
