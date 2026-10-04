# Plan — Android: old sign-up screen sends invalid business-type tags

Issue: #409 · Status: approved · Spec: ./spec.md

## Root cause

`RegisterStoreScreen` hard-codes `listOf("AO_DAI", "COSTUME", "WEDDING", "EQUIPMENT", "VEHICLE", "FILM", "OTHER")`
as the chip values and passes the selected ones straight to `ApiParity.registerMerchant`. The API
enum names are `WEDDING_DRESS` and `FILM_EQUIPMENT`.

## Steps

1. Test first: move the chip list (value + label) unchanged into `domain/auth/LegacyRegisterTags.kt`
   (pure, no behavior change) and add `LegacyRegisterTagsTest`, which checks every chip against the
   API catalog. Commit `test(mobile): …`; it fails on `WEDDING` / `FILM`.
2. Fix: the two chip values become `WEDDING_DRESS` and `FILM_EQUIPMENT`; the screen sends
   `LegacyRegisterTags.payload(selected)`. Commit `fix(mobile): … (#409)`.
3. Verify: `./gradlew :app:testDebugUnitTest :app:assembleDebug`; manual sign-up on emulator against a
   local API with `newAuth` off; read `Merchant.businessTags` from the DB.

## Files

- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/auth/LegacyRegisterTags.kt` (new)
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/auth/AuthScreens.kt`
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/domain/auth/LegacyRegisterTagsTest.kt` (new)

## Risks

- None for installed apps; the request only changes from invalid to valid values.

## Rollback

Revert the fix commit.
