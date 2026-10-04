# Spec — Android: availability refused on the device for a merchant without an outlet

Issue: #411 · Status: approved · Intent: ./intent.md

## Behavior

Applies to `checkAvailability` (GET `/api/products/:id/availability`), `checkBatchAvailability`
(POST `/api/products/batch-availability`) and `occupancyCalendar`
(GET `/api/products/:id/availability-calendar`).

1. Session has an `outletId` (any role) → the request carries that `outletId` (unchanged).
2. MERCHANT with no `outletId` → the request is sent without `outletId` (no query param, no body
   field); the API resolves the default outlet.
3. ADMIN with no `outletId` → refused on the device with `AppError.Validation`, no request. The API
   requires an explicit outlet for ADMIN on all three routes.
4. OUTLET_ADMIN / OUTLET_STAFF / unknown role with no `outletId` → refused on the device (unchanged).
   An outlet user without an outlet is a broken session; keep the clear local message.
5. If the API answers 400 `OUTLET_REQUIRED` (merchant with no default and several outlets), the error
   reaches the screen as today (`AppError.from`, message mapped by `ApiErrorMessages`).

## Out of scope

- Choosing an outlet in the mobile UI.
- `ApiParity` availability helpers (they never send `outletId`).

## API and data

No API change. Request shape for MERCHANT drops `outletId`, which the routes accept since #402.

## Acceptance

- [x] Behaviors 1–4 covered by `app/src/test/java/com/anyrent/pos/data/repository/DefaultAvailabilityRepositoryOutletTest.kt`
- [x] iOS checked: already omits `outletId` when nil
- [x] No new user-facing strings
- [x] Manual: merchant2 (no outlet) runs an availability check on old and new screens against a local API
