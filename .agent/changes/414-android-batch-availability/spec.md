# Spec — Android: batch availability ignores data.results

Issue: #414 · Status: approved · Intent: ./intent.md

## Behavior

1. `checkBatchAvailability` makes one `POST /api/products/batch-availability` and reads each
   product from `data.results[]` by `productId`: `isAvailable`, `totalAvailableStock`,
   `totalStock`, `totalRenting`, `requestedQuantity` and `availabilityByOutlet[0].conflicts`.
2. No `GET /api/products/{id}/availability` call when every product is in `results` without `error`.
3. A product missing from `results`, or whose entry has `error`, is checked with the single call.
4. HTTP 404/405 on the batch route still falls back to single checks; other HTTP errors still throw.
5. A login without an outlet (MERCHANT) sends no `outletId`; the API uses the merchant's default
   outlet (#402), as iOS sends `outletId` only when it has one. Before, the repository threw
   "An outlet is required" and merchant logins could not create a rent order on Android.
6. The older keys (`data[<id>]`, `availability`, `availabilityByProduct`, `products`) still parse.

## Out of scope

- `ApiParity.batchAvailability` (no callers).

## Acceptance

- [ ] `DefaultAvailabilityRepositoryBatchTest` with the captured response covers 1–4
- [ ] Manual: API log shows one batch request and no single checks for a cart check
