# Plan — Cart shortage warning in amber

Issue: #1054 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests first, committed alone (`bug-fix-tdd`): iOS `POS ADBDTests/ProductsV2Tests.swift`,
   Android `app/src/test/java/com/anyrent/pos/domain/products/ProductRulesTest.kt`.
2. iOS: `CartV2Logic.ShortageTone`, `shortageTone(left:)`, `shortagePill(left:)`, `shortageWeight(left:)` in
   `Model/ProductsV2.swift`; use them for the warn label in `CartV2ViewController.swift`.
3. Android: the same in `CartV2Logic` (`domain/products/ProductRules.kt`); `CartV2Screen.kt` uses the pill and
   weight only for the shortage text (the overlap tag keeps red).
4. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `:app:assembleDebug :app:testDebugUnitTest`,
   simulator screenshot of a rent line with "Chỉ còn 1 trống…" on a local seeded API.

## Files

- `apps/mobile/POS ADBD/Model/ProductsV2.swift` — tone helper
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/CartV2ViewController.swift` — pill colours
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/products/ProductRules.kt` — tone helper
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/home/v2/CartV2Screen.kt` — pill colours
- tests in both apps

## Risks

UI only. No API, no strings.

## Rollback

Revert the PR.
