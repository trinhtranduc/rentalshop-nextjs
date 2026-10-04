# Plan — Mobile Home product list matches the approved board

Issue: #383 · Status: accepted · Spec: ./spec.md

## Steps

1. Pure helpers + tests:
   - iOS `Model/ProductsV2.swift`: `ProductRowLogic.cartCount`, `.subtitle`, `.addState`; tests in `POS ADBDTests/ProductsV2Tests.swift`.
   - Android `domain/products/ProductRules.kt`: `ProductRowLogic` with the same three; tests in `ProductRulesTest.kt`.
2. iOS `Viewcontrollers/Products/v2/ProductsHomeViewController.swift`: drop chips and category loading, move the
   two buttons into the search field, row subtitle, add-button states, reload rows on cart change, blue cart bar.
   `ViewModels/ProductsHomeViewModel.swift`: drop `categoryId`.
3. Android `ui/home/v2/ProductsHomeScreen.kt` + `ProductsHomeViewModel.kt` (+ `data/ProductsV2Api.kt`): same changes.
4. Strings: in-cart accessibility label (iOS vi/en, Android values/values-vi); remove the unused "All" chip key.
5. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `:app:testDebugUnitTest :app:assembleDebug`, manual check
   against a local API with `MOBILE_FEATURES=newProducts`.

## Files

- iOS: `ProductsHomeViewController.swift`, `ProductsHomeViewModel.swift`, `ProductsV2.swift`, `Localizable.strings` (vi, en), `ProductsV2Tests.swift`
- Android: `ProductsHomeScreen.kt`, `ProductsHomeViewModel.kt`, `ProductsV2Api.kt`, `ProductRules.kt`, `strings.xml` (values, values-vi), tests

## Risks

- Flag-off Home must not change: only v2 files are touched.

## Rollback

Revert the PR; the flag can also be turned off server-side.
