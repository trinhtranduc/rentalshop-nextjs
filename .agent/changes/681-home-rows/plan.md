# Plan — Cleaner Home product rows

Issue: #681 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS: add `ProductRowLogic.priceParts(product)` (main price, main unit, optional second, sale-only) with tests
   in `POS ADBDTests/ProductsV2Tests.swift`.
2. iOS `ProductRowV2Cell`: drop `metaLabel` from the row, order name / price / stock, spacing 8,
   light + style, use `priceParts`. Cart bar colour slate 900.
3. Android `ProductsHomeScreen.kt` + `ProductRules.kt`: same rule and layout; unit test in `app/src/test`.
4. Verify (`verify-change`, `mobile-parity`): unit tests, `xcodebuild` + `./gradlew :app:assembleDebug`,
   screenshots on simulator/emulator against the local seeded API (`mobile-e2e-local`).

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductsHomeViewController.swift`
- `apps/mobile/POS ADBD/Model/ProductsV2.swift` (or where `ProductRowLogic` lives)
- `apps/mobile/POS ADBDTests/ProductsV2Tests.swift`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/home/v2/ProductsHomeScreen.kt`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/products/ProductRules.kt` + test

## Risks

- Staff who read the code on the row now open detail for it; search by code still works.

## Rollback

Revert the PR; UI only.
