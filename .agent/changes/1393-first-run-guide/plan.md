# Plan — First-run guide

Issue: #1393, #1394 · Status: in-progress · Spec: ./spec.md

## PR 1 (#1393): card

1. Failing tests: `apps/mobile/POS ADBDTests/FirstRunGuideTests.swift`, `apps/mobile-android/app/src/test/.../domain/guide/FirstRunGuideTest.kt`.
2. iOS rules and tracker: `POS ADBD/Model/FirstRunGuide.swift`. Card view: `Viewcontrollers/Products/v2/FirstRunGuideCardView.swift`. Home: table header in `ProductsHomeViewController.swift`. Settings: `SettingsV2.swift`, `SettingsV2ViewController.swift`.
3. Android: `domain/guide/FirstRunGuide.kt`, `ui/home/v2/FirstRunGuideCard.kt`, `ProductsHomeScreen.kt`, `SettingsRows.kt`, `SettingsV2Screen.kt`, `AnyRentNavHost.kt`.
4. Strings with `i18n-keys`: en and vi only.

## PR 2 (#1394): bubbles

5. Overlay per app, anchored by identifier, and the step sequence as a pure rule with tests.
6. Identifiers on the 4 screens. One UI test per app walks the whole guide on a shop made through `POST /api/auth/register`.

## Verify

- iOS: `xcodebuild test -only-testing:"POS ADBDTests/FirstRunGuideTests"` and a Development simulator build.
- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`.
- Visible UI runs: dedicated Simulator and AVD, local API on a Homebrew :5432 database. Screenshots in `~/Documents/AnyRent-shots/first-run-guide/`.

## Files

Listed in the steps above. No file under `apps/api`, `packages/`, `prisma/`.

## Risks

- A bubble drifting when a screen changes: anchors, silent skip and the UI test.
- Two small GETs on each Home appearance for an owner still at 0 orders; none after the first order or after skip.

## Rollback

Revert the PRs. Local keys left behind are harmless.
