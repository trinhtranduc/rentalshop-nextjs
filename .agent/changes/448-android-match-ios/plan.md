# Plan — Android new-UI screens match iOS

Issue: #448 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests first, committed alone: `CartDatesChosenTest`, `OrderReviewV2Test`,
   `Issue448ResourcesTest` (apps/mobile-android/app/src/test).
2. `CartStore`: `datesChosen` flow; set by `setPickup`/`setReturn`/`loadFromOrderDetail`, cleared
   by `clear`, persisted in the draft. `CartV2Logic.problems(...)` for the iOS validation list.
3. `CartV2Screen`: "Chọn ngày thuê" row, validation alert.
4. `OrderReviewV2` (domain): sections and confirm amount. `CartCheckoutScreen(reviewV2 = true)` from
   `Routes.CartV2Preview` only: iOS title, labels, button, and `OrderReviewConfirmSheet`.
5. `AuthV2Screens.AuthPage`: bring the form block into view while the keyboard animates; hide the
   footer with the keyboard on login and forgot password.
6. `HandOverSheet`: `testTag`s; `testTagsAsResourceId` at the root in `MainActivity`.
7. Verify: `./gradlew :app:testDebugUnitTest :app:assembleDebug`; Maestro `rent-handover.yaml` on
   emulator-5570 against the local API (:3180).

Skills: `mobile-parity` (Android catches up to iOS, no API change), `i18n-keys` (Android strings
only; no web or error-code change), `bug-fix-tdd` (tests first).

## Files

- `data/CartStore.kt`, `domain/products/ProductRules.kt`, `ui/home/v2/CartV2Screen.kt`
- `domain/orders/OrderReviewV2.kt`, `ui/home/CartCheckoutScreen.kt`,
  `ui/home/v2/OrderReviewConfirmSheet.kt`, `ui/navigation/AnyRentNavHost.kt`
- `ui/auth/v2/AuthV2Screens.kt`, `ui/orders/v2/OrderDetailV2Sheets.kt`, `MainActivity.kt`
- `res/values/strings.xml`, `res/values-vi/strings.xml`

## Risks

- A draft saved before this change has no `datesChosen` key: treat it as chosen so a restored
  draft keeps its dates.

## Rollback

Revert the PR; no data or API change.
