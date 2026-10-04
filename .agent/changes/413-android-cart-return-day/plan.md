# Plan — Android: cart saves the return day as 23:59 UTC

Issue: #413 · Status: approved · Spec: ./spec.md

## Root cause

`CartStore.isoPickup()` / `isoReturn()` format a `LocalDateTime` and append `"Z"`
(`atStartOfDay()` / `atTime(23, 59)`), so the local day is sent as a UTC day.
`CartStore.parseOrderDate` takes `raw.take(10)` (the UTC day) when loading an order for edit.
`DefaultAvailabilityRepository` builds `${day}T00:00:00Z` / `${day}T23:59:59Z` windows the same way.

## Steps

1. Test first: `app/src/test/java/com/anyrent/pos/data/CartPlanDatesTest.kt` drives
   `CartStore.setPickup/setReturn/isoPickup/isoReturn/loadFromOrderDetail` with the default zone set to
   `Asia/Ho_Chi_Minh` and to `UTC`. Commit `test(mobile): …` alone; it must fail on the instants.
2. Fix: `domain/orders/OrderPlanDays.kt` (pure: `pickupInstant`, `returnInstant`, `dayOf`, zone
   parameter defaulting to the device zone). `CartStore.isoPickup/isoReturn/parseOrderDate` and
   the availability repository windows call it. Commit `fix(mobile): … (#413)`.
3. Verify: `./gradlew :app:testDebugUnitTest :app:assembleDebug`; manual order in both carts
   against the local API; read the stored instants from the DB.

## Files

- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/orders/OrderPlanDays.kt` (new)
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/data/CartStore.kt` (date lines only)
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/data/repository/DefaultAvailabilityRepository.kt`
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/data/CartPlanDatesTest.kt` (new)

## API compatibility (installed apps)

No API change.
