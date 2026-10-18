# Plan — Cart availability note

Issue: #1064 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests first, committed alone (`bug-fix-tdd`): iOS `POS ADBDTests/ProductsV2Tests.swift`, Android
   `ProductRulesTest.kt` and `CartShortageStyleTest.kt`: every branch of `availabilityNote` and the green style.
2. iOS: `ShortageTone.ok`, `AvailabilityNote`, `availabilityNote(...)`; strings in `en` and `vi-VN`
   (append with `cat >>`, check `wc -l`); `CartV2ViewController` renders the one pill and drops the grey row.
3. Android: the same in `CartV2Logic`; strings inserted before `</resources>` (check `xmllint`);
   `CartV2Screen.kt` and `CartShortageStyle`.
4. UI test predicate in `AnyRentE2ETests.swift` (`test7eOverlapSetting`) also accepts the new texts.
5. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `:app:assembleDebug :app:testDebugUnitTest`,
   `test7eOverlapSetting` on a local seeded API, screenshots of green, amber and red.

## Files

- `apps/mobile/POS ADBD/Model/ProductsV2.swift`, `Viewcontrollers/Products/v2/CartV2ViewController.swift`,
  `*.lproj/Localizable.strings`, `POS ADBDTests/ProductsV2Tests.swift`, `POS ADBDUITests/AnyRentE2ETests.swift`
- `apps/mobile-android/.../domain/products/ProductRules.kt`, `ui/home/v2/CartV2Screen.kt`,
  `res/values{,-vi}/strings.xml`, tests

## Risks

UI only. No API. Strings files edited by append (two past wipes of Localizable.strings).

## Rollback

Revert the PR.
