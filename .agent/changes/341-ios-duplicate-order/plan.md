# Plan — iOS create order duplicates

Issue: #341 · Status: in-progress · Spec: ./spec.md

## Steps

1. Extract order-create signature + advisory lock key helper; add a Jest test.
2. Wrap `findRecentDuplicate` + `db.orders.create` in a transaction with `pg_advisory_xact_lock`.
3. On iOS: latch `proceedWithSave`, disable Save while in flight, keep cancel reset behavior.
4. Verify with the new test.

## Files

- `packages/database/src/order-create-idempotency.ts` — signature + lock key
- `packages/database/src/order.ts` — locked create helper
- `apps/api/app/api/orders/route.ts` — call locked create
- `apps/mobile/.../PreviewViewController.swift` — re-entry guard
- `tests/packages/orders/order-create-idempotency.test.ts` — unit test

## Risks

Advisory lock is per-database transaction; wrong key hash could over-serialize unrelated creates (accept for identical totals).

## Rollback

Revert the PR. No migration to undo.
