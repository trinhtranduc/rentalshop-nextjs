# Android: batch availability ignores data.results

Issue: #414 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

`POST /api/products/batch-availability` answers `{ data: { results: [ { productId, … } ], summary } }`.
`DefaultAvailabilityRepository.parseBatchItem` looks for `data[<id>]`, `availability`,
`availabilityByProduct` or `products`, never `results`, so every product falls back to
`GET /api/products/{id}/availability`. A cart with N products makes N+1 requests.

## Proposed outcome

The batch answer is parsed from `data.results[]` (the shape iOS decodes as
`BatchAvailabilityData.results: [BatchProductAvailabilityResult]`). A cart check makes one request.
The single check runs only for a real failure: the batch route is missing (404/405), the product is
missing from `results`, or its entry carries `error`.

## Affected users and systems

All Android users who check a rent cart (old cart and `CartV2`). No API change.

## Constraints

- Unit test built from a real response captured from the local API.
- No API or iOS change.

## Open questions

- None.

## Decision log

- 2026-10-04 — An entry with `error` (`PRODUCT_NOT_FOUND`, `PRODUCT_OUTLET_NOT_FOUND`) falls back
  to the single check, which reports the real error, instead of being read as "available".
- 2026-10-04 — Found during the manual check: with `merchant2` (no outlet) the repository refused to
  check at all, so checkout failed before any request. The batch and single checks now omit
  `outletId` when the session has none (API #402 resolves the default outlet). `occupancyCalendar`
  is unchanged.
