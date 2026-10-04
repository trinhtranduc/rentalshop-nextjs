# Spec — Android: old sign-up screen sends invalid business-type tags

Issue: #409 · Status: approved · Intent: ./intent.md

## Behavior

1. Each chip on the old register screen maps to exactly one value of the API `businessTags` enum.
2. The "Wedding dress rental / Cho thuê váy cưới" chip sends `WEDDING_DRESS`.
3. The "Film equipment rental / Thiết bị quay phim" chip sends `FILM_EQUIPMENT`.
4. The seven chips together cover the whole API catalog, each once, in the same on-screen order as before.
5. The payload holds only the selected chips' API values, in catalog order, no duplicates.

## Out of scope

- The new auth screens (#404), which already send the right values.
- Chip labels, layout, and the "at least one chip" rule on the old screen.

## API and data

No API change. `POST /api/auth/register` body field `businessTags` now always passes the zod enum.

## Acceptance

- [x] Behaviors 1–5 covered by `app/src/test/java/com/anyrent/pos/domain/auth/LegacyRegisterTagsTest.kt`
- [x] iOS checked: `AuthenticationService.createAccount` and `RegisterStoreViewController.businessOptions` already send catalog values
- [x] No new user-facing strings
- [x] Manual: sign-up on the old screen with the wedding and film chips against a local API; DB row shows the tags
