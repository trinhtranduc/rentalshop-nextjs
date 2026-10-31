# Plan — 3-page onboarding

Issue: #1404 · Status: in-progress · Spec: ./spec.md

## Steps

1. Tests first (`OnboardingV2Tests.swift`, `OnboardingV2CycleTest.kt`, `Issue1404ResourcesTest.kt`). Commit them red.
2. iOS: strings, assets, `OnboardingV2Cycle.swift` (cycle, timeline, metrics, sample money), `OnboardingV2Stage.swift`, rewrite of the view controller.
3. Android: the same, in `OnboardingV2Cycle.kt`, `OnboardingV2Stage.kt`, `OnboardingV2Screen.kt`.
4. Remove the old `onboarding.v2.step/product/customer/order` strings and the old icon code (library symbols only, nothing else used them here).
5. Verify (below), record, write the PR body in Vietnamese.

Domain skills: `mobile-parity`, `mobile-e2e-local`. `timezone-dates` does not apply: the calendar is fixed sample text with no date logic.

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Onboarding/OnboardingV2ViewController.swift` — rewrite
- `apps/mobile/POS ADBD/Viewcontrollers/Onboarding/OnboardingV2Cycle.swift`, `OnboardingV2Stage.swift` — new
- `apps/mobile/POS ADBD/Assets.xcassets/onboarding_v2_*.imageset` — 5 stand-ins
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings`, `POS ADBD.xcodeproj/project.pbxproj`
- `apps/mobile/POS ADBDTests/OnboardingV2Tests.swift` — new
- `apps/mobile-android/.../ui/onboarding/OnboardingV2Screen.kt` — rewrite
- `apps/mobile-android/.../ui/onboarding/OnboardingV2Cycle.kt`, `OnboardingV2Stage.kt` — new
- `apps/mobile-android/app/src/main/res/drawable-nodpi/onboarding_v2_*` — 5 stand-ins
- `apps/mobile-android/app/src/main/res/values{,-vi}/strings.xml`
- `apps/mobile-android/app/src/test/.../OnboardingV2CycleTest.kt`, `res/Issue1404ResourcesTest.kt` — new

## Verify

- iOS: `xcodebuild … -scheme Development … build` and the `OnboardingV2Tests` class.
- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug` (`VietQrTest.onlyOwnersAndOutletAdminsManage` is a known red, fixed elsewhere).
- Watched on a visible dedicated Simulator and AVD, small and large, both languages, fast swipes, background and return. Recorded.

## Risks

- Animation on old phones: frames are few and per-frame work is small, but no real device was tried here.
- Stand-in images must not reach a store release (PR body says so in bold).
- `apps/mobile-android/.kotlin/sessions/*.salive` is tracked: restore before committing.

## Rollback

Revert the PR. No data, flag or API change.
