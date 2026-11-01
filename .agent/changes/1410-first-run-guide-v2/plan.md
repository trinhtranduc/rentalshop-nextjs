# Plan — First-run guide v2

Issue: #1410, #1411, #1412 · Status: in-progress · Spec: ./spec.md

## PR 1 (#1410): card and collapse, both apps

1. Failing tests: `FirstRunGuideTests.swift`, `FirstRunGuideTest.kt`.
2. Rules: `Model/FirstRunGuide.swift`, `domain/guide/FirstRunGuide.kt` (mark `collapsed`, card `.collapsed`, `collapse`, `expand`, `reopen`, `bounces`).
3. Card: `FirstRunGuideCardView.swift`, `FirstRunGuideCard.kt`. Home and Settings wiring. Old bubble button in the overlays.
4. Strings with `cat >>`, then `wc -l`, `plutil`.
5. `FirstRunGuideUITests`, `android-first-run-guide.sh`.

## PR 2 (#1411): iOS walk

6. Failing tests: `FirstRunCoachTests.swift`.
7. `FirstRunCoach.swift` plan and rules. `FirstRunCoachOverlay.swift` Tiếp, counter, Thoát, flash, camera line. Anchors and form hooks in `ProductFormViewController`, `NewCustomerViewController`, `CustomersV2ListViewController`, `CartV2ViewController`.
8. `FirstRunGuideUITests`: fills every field, picks a seeded photo.

## PR 3 (#1412): Android walk

9. Failing tests: `FirstRunCoachTest.kt`.
10. `FirstRunCoach.kt`, `FirstRunCoachOverlay.kt`, `ProductFormV2Screen.kt`, `CustomersV2Screens.kt`, `CartV2Screen.kt`, `ProductsHomeScreen.kt`.
11. `android-first-run-guide.sh`: fills every field, picks a seeded photo.

## Verify

iOS Development Simulator: tests touched plus full `POS ADBDTests` on a clean simulator. Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`. Visible walks on a dedicated Simulator and AVD against a local API on a Homebrew :5432 database. Shots in `~/Documents/AnyRent-shots/first-run-guide-v2/`.

## Files

Only `apps/mobile`, `apps/mobile-android`, `scripts/mobile-e2e`, this folder. None under `apps/api`, `packages/`, `prisma/`.

## Risks

- PRs appending to `Localizable.strings` and `strings.xml` conflict: merge dev, keep both sides, check duplicates.
- The photo picker runs outside the app in a UI test and can be flaky; the library is seeded first.

## Rollback

Revert the PRs. A left-over local key is harmless.
