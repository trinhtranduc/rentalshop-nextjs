# One confirm creates one order

Issue: #341 · Author: agent · Status: in progress · Created: 2026-10-05

## Problem

One Save / Confirm on the iOS POS app sometimes creates two identical orders (same customer,
products, total). Staff then cancel one by hand, and stock was reserved twice.

Causes found on `dev`:

- iOS `PaymentCollectionViewController.confirmTapped` has no latch: a second tap during the dismiss
  animation calls `didConfirmPayment` again, so `PreviewViewController.proceedWithSave` runs twice.
- iOS Preview keeps Save enabled while the create request is in flight.
- `POST /api/orders` has no duplicate guard at all. (The earlier `findRecentDuplicate` attempt in
  closed PR #342 never reached `dev`, and it was check-then-create.)
- Android `CartCheckoutScreen.submitOrder` has no re-entry guard; `clickable(enabled = !loading)` only
  takes effect after recomposition, so a fast double tap can submit twice.

## Proposed outcome

- Two concurrent `POST /api/orders` with the same `Idempotency-Key` from one user produce one order;
  the second gets the first order back (HTTP 200, normal `ORDER_CREATED_SUCCESS` shape).
- A retried create with the same key returns the existing order.
- Requests without a key create orders exactly as before.
- iOS and Android disable the create CTA while the request is in flight and send an `Idempotency-Key`.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` creating orders. API `POST /api/orders`, iOS, Android.
Web create keeps working unchanged (sends no key).

## Constraints

- Installed apps (built from `origin/main-real`) send no key; their create must keep working unchanged.
- Keep merchant/outlet scoping and numeric ids. No response shape change.
- Any migration must be additive, and order create must keep working if it has not run yet.

## Open questions

- Should web `ordersApi.create` also send an `Idempotency-Key`? Out of scope here.

## Decision log

- 2026-10-05 — Server: Postgres advisory transaction lock per (outlet, customer, creator) around
  "find duplicate → insert". Keyed requests are matched by key (new `OrderCreateKey` table);
  unkeyed requests by an identical-order window of 60 s. (agent)
- 2026-10-05 — Drop the 60 s identical-order window: a request without an `Idempotency-Key` is never
  merged with or answered by an existing order; it creates an order as before. Only the key dedupes, and
  the advisory lock is per (user, key). Accepted that installed apps are protected only after users
  update to a build that sends the key. (owner)
