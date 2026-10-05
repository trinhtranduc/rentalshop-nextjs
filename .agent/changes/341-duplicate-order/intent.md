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

- Two concurrent identical `POST /api/orders` produce one order; the second gets the first order back.
- A retried create (same `Idempotency-Key`, or identical body within 60 s for old apps) returns the
  existing order, with HTTP 200 and the normal `ORDER_CREATED_SUCCESS` shape.
- Two different orders sent at the same time are both created.
- iOS and Android disable the create CTA while the request is in flight and send an `Idempotency-Key`.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` creating orders. API `POST /api/orders`, iOS, Android.
Web create keeps working unchanged (protected by the server window).

## Constraints

- Installed apps (built from `origin/main-real`) cannot be updated: the server guard must work without
  any new header.
- Keep merchant/outlet scoping and numeric ids. No response shape change.
- Any migration must be additive, and order create must keep working if it has not run yet.

## Open questions

- Should web `ordersApi.create` also send an `Idempotency-Key`? Not needed for this bug; the window
  covers it.

## Decision log

- 2026-10-05 — Server: Postgres advisory transaction lock per (outlet, customer, creator) around
  "find duplicate → insert". Keyed requests are matched by key (new `OrderCreateKey` table);
  unkeyed requests by an identical-order window of 60 s. (agent)
