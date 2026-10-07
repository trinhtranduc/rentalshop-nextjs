# Intent — Timezone batch A: availability in Vietnam days

Issue: #590 (sub-issue of #578, closes #575, #576) · Author: Trinh (via Claude) · Status: in progress · Created: 2026-10-07

## Problem

Availability endpoints read some request windows as UTC days (API-1, #576) or compare an exclusive
VN-day end inclusively (API-2, #575). Result: false "busy" the day before a pickup, and on the legacy
`GET /api/products/availability` the last 7 hours of a VN day are not checked (double booking).

## Outcome

`GET /api/products/availability`, `POST /api/products/batch-availability` and `GET /api/products/[id]/availability`
answer in Vietnam civil days for every request shape installed apps send (#578 spec §A, A1–A3).

## Constraints

#578 intent: API only, response shapes unchanged, no schema or data change, old inputs keep working.
Not in scope: `packages/utils` date-range (batch B), admin hook (batch C), mobile code (batch F), #577.
