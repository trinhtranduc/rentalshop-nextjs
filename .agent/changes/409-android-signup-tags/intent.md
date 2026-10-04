# Android: old sign-up screen sends invalid business-type tags

Issue: #409 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

The old Android register screen (`ui/auth/AuthScreens.kt` → `RegisterStoreScreen` →
`ApiParity.registerMerchant`) offers seven "what do you rent" chips. Two of them send `WEDDING` and
`FILM`. `POST /api/auth/register` validates `businessTags` with a zod enum
(`packages/utils/src/core/validation-schemas.ts`), so a sign-up with either chip is rejected and the
shop cannot be created. Users on the old screen (flag `newAuth` off) who pick "Váy cưới" or
"Thiết bị quay phim" cannot sign up.

## Proposed outcome

Every chip on the old screen sends a value from the API catalog
(`AO_DAI`, `COSTUME`, `WEDDING_DRESS`, `EQUIPMENT`, `VEHICLE`, `FILM_EQUIPMENT`, `OTHER`), and a
sign-up with the wedding and film chips creates a merchant whose `businessTags` hold
`WEDDING_DRESS` and `FILM_EQUIPMENT`.

## Affected users and systems

New merchants signing up on Android with `newAuth` off. Android only. iOS checked (see spec).

## Constraints

- No API change. Same chips, labels and order on screen.
- Follow `bug-fix-tdd`: failing unit test committed before the fix.

## Open questions

- None.

## Decision log

- 2026-10-04 — Map the chips to the API enum in a small pure object (`LegacyRegisterTags`) with a unit test (issue #409).
- 2026-10-04 — iOS old register (`RegisterStoreViewController` → `AuthenticationService.createAccount`) already sends `WEDDING_DRESS` / `FILM_EQUIPMENT` and filters to the catalog; no iOS change.
