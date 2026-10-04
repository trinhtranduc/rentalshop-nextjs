# Plan — Android: availability refused on the device for a merchant without an outlet

Issue: #411 · Status: approved · Spec: ./spec.md

## Root cause

`DefaultAvailabilityRepository` (lines 69, 93, 269 on `dev`) does
`outletIdProvider() ?: throw AppError.Validation("An outlet is required …")` for every role. The
role is never consulted, and #402 made the API resolve the outlet for MERCHANT.

## Steps

1. Test first: add a `roleProvider: () -> String?` constructor seam (default `SessionStore.role`, not
   yet used) and `DefaultAvailabilityRepositoryOutletTest`, which drives the repository through an
   `ApiClient` with a recording OkHttp interceptor. Cases: MERCHANT without outlet (single, batch,
   calendar) sends no `outletId`; outlet user with outlet sends it; ADMIN without outlet is refused
   with no request. Commit `test(mobile): …`; MERCHANT cases fail with the validation error.
2. Fix: one private `outletParam()` applies the spec rule; the three calls append `outletId` only when
   present. Commit `fix(mobile): … (#411)`.
3. Verify: `./gradlew :app:testDebugUnitTest :app:assembleDebug`; manual check as merchant2 on the
   availability screen (old), old cart checkout and new cart (`newProducts`) against a local API.

## Files

- `apps/mobile-android/app/src/main/java/com/anyrent/pos/data/repository/DefaultAvailabilityRepository.kt`
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/data/repository/DefaultAvailabilityRepositoryOutletTest.kt` (new)

## Where an outlet is still required on the device

| Role | No session outlet | Why |
|---|---|---|
| MERCHANT | send without `outletId` | API resolves default / only active outlet (#398) |
| ADMIN | refuse | API returns `OUTLET_REQUIRED` for ADMIN without `outletId` on all three routes |
| OUTLET_ADMIN / OUTLET_STAFF / unknown | refuse | the session is broken; keep the local message |

## Risks

- A merchant with several outlets and no default gets the API's `OUTLET_REQUIRED` instead of the
  local message; `ApiErrorMessages` already maps it.

## Rollback

Revert the fix commit.
