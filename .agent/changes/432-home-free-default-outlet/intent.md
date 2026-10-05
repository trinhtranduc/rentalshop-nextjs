# Home "N free" for a merchant counts stock across all outlets

Issue: #432 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

A MERCHANT login has no outlet. The redesigned Home on iOS and Android calls `GET /api/products`
without `outletId`, so the API has no availability outlet and falls back to shelf stock summed over
every outlet (`totalStock - renting` of all outlets). merchant1 sees "Product 1 · 21 free" while the
product detail strip (availability-calendar, which defaults to the merchant's default outlet since
#398) and staff of the same outlet see 12. Found in the #391 e2e run.

## Proposed outcome

For a MERCHANT caller from a mobile client (`X-Client-Platform: mobile`) that sends no `outletId`,
`GET /api/products` computes today's free count on the merchant's default outlet (same lookup as
#398: active default, else the only active outlet). Home then shows 12, the same as the detail strip
and as staff.

## Affected users and systems

- Roles: `MERCHANT` on iOS/Android. Outlet roles, `ADMIN`, and merchants sending `outletId` unchanged.
- Apps: `api` only. Installed iOS and Android builds get the fix without an update.
- Web client: unchanged. Its product list (header `X-Client-Platform: web`) keeps the all-outlets
  view for a merchant, with the outlet filter as the way to scope.

## Constraints

- Backward compatible: no field removed or renamed, no new required param, no new error.
- A merchant with no default and several active outlets keeps the old all-outlets numbers (no 400 on
  a list).

## Open questions

- None.

## Decision log

- 2026-10-05 — Fix in the API, not the apps: installed apps do not know the default outlet id and
  cannot be updated on our schedule; #398 already defaults merchant availability routes this way.
  Gate on the mobile platform header so the web product list keeps its all-outlets meaning (agent).
