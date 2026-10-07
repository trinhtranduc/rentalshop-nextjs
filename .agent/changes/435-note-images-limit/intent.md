# Five photos per order note

Issue: #435 · Author: Trinh Tran · Status: in progress · Created: 2026-10-05

## Problem

Staff can attach only 3 photos to an order note (general, pickup, return, damage) on web, iOS and
Android. Shops need more to record item condition at hand-over and return. The API sets no limit,
and the apps upload phone photos at JPEG 0.8 (often several MB) before the server shrinks them.

## Proposed outcome

- Up to 5 photos per note field on web, iOS and Android.
- The API rejects more than 5 per field with `IMAGE_VALIDATION_FAILED` (400).
- Clients compress note photos to ~180KB; the server still compresses to 200KB.

## Affected users and systems

- Roles: `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`; scope unchanged.
- Apps: api, client (`OrderSettingsCard`), iOS, Android, `packages/constants`.

## Constraints

- Installed apps (built from `main-real`) cap at 3 photos, so they never hit the new 400.
- Work on `dev`, verify on dev-api, promote to production later.
- iOS and Android in the same change (`mobile-parity`).

## Decision log

- 2026-10-05: started on a `main`-based branch; moved onto `origin/dev` before finishing.
