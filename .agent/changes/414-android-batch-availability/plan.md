# Plan — Android: batch availability ignores data.results

Issue: #414 · Status: approved · Spec: ./spec.md

## Root cause

`parseBatchItem` in `data/repository/DefaultAvailabilityRepository.kt` has no branch for
`data.results`, throws `InvalidResponse`, and the caller falls back to `checkAvailability`.

## Steps

1. Test first: `app/src/test/java/com/anyrent/pos/data/repository/DefaultAvailabilityRepositoryBatchTest.kt`
   runs the real repository over an `ApiClient` whose OkHttp interceptor serves the response captured
   from the local API (products 31 and 62, merchant2) and records every request. Commit
   `test(mobile): …` alone; it must fail on the request count.
2. Fix: `parseBatchItem` reads `data.results[]` first; an entry with `error` is a failure.
   Commit `fix(mobile): … (#414)`.
3. Verify: unit tests + build; manual cart check with the API log.

## Files

- `apps/mobile-android/app/src/main/java/com/anyrent/pos/data/repository/DefaultAvailabilityRepository.kt`
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/data/repository/DefaultAvailabilityRepositoryBatchTest.kt` (new)

## API compatibility (installed apps)

No API change.
