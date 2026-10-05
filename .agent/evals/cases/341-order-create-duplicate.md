# orders: one Save / Confirm created two orders

Status: active · Added: 2026-10-05 · Source: #341

## Failure

- iOS payment confirm had no latch and Preview kept Save enabled while the create was in flight, so one
  confirm could send `POST /api/orders` twice. Android `submitOrder` had no re-entry guard either.
- `POST /api/orders` inserted every request. A check-then-create duplicate lookup (closed PR #342) still races.

## Detect

```bash
cd tests && yarn test api/order-create-duplicate
```

## Pass

Two concurrent identical creates produce one order and both responses carry its id. A retry with the same
`Idempotency-Key`, or the same body without a key within 60 s, returns that order. Different orders sent together
are all created. The lookup and the insert run in one transaction under `pg_advisory_xact_lock`
(`packages/database/src/order-create-guard.ts`).

## Notes

Installed apps send no key, so the server guard must keep working without one. A create path that skips
`db.orders.createOnce` brings the bug back. Mobile CTAs that create must ignore taps while a request is in flight.
