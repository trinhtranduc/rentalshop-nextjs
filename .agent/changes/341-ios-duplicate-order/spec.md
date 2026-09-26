# Spec — iOS create order duplicates

Issue: #341 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `proceedWithSave` on iOS cannot start a second create while one is in flight.
2. The Save button is disabled while create is in flight.
3. `POST /api/orders` holds a Postgres advisory lock for the create signature before `findRecentDuplicate` and create, so two concurrent identical posts produce one order.
4. A sequential second identical create within 60 seconds still returns the existing order.

## Out of scope

Android and web double-submit UX (separate issues if still needed). Idempotency-Key storage table.

## API and data

No schema change. Lock key is derived from outlet, customer, creator, type, total, and item signature.

## Acceptance

- [ ] Unit test covers lock-key / signature stability
- [ ] iOS PreviewViewController guards re-entry into proceedWithSave
- [ ] API create path uses the lock around duplicate check + insert
