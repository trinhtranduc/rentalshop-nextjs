# Orders: iOS double-confirm creates two orders

Status: active · Added: 2026-09-26 · Source: #341

## Failure

One Save → Confirm on the iOS preview screen created two identical orders. Payment
confirm had no latch, Preview had no in-flight create guard, and POST /api/orders
had no atomic duplicate check.

## Detect

`cd tests && yarn test packages/orders/order-create-idempotency.test.ts`

Review `PaymentCollectionViewController.confirmTapped` for `isConfirming` and
`PreviewViewController.proceedWithSave` for `isCreateRequestInFlight`. API create
must call `db.orders.createUnlessRecentDuplicate`.

## Pass

A double confirm produces one order. Concurrent identical POSTs serialize on
`pg_advisory_xact_lock` and return the first order.

## Notes

Skill: `bug-fix-tdd`, `mobile-parity`. Issue #341.
