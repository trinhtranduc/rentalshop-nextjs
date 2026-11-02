# Plan: onboarding before login on first launch

Issue: #1455 · Status: accepted · Spec: ./spec.md

## Steps

1. Add the rule with today's behavior and its tests. Run them red on both apps. Commit.
2. Change the rule. iOS: one start function for launch and the update screen lifting, finish goes through the rule, login marks done and goes to Home, `forceMain` goes away (nothing left to force). Android: same in `AnyRentNavHost`, pages allowed without a session, the screen chosen once.
3. Update UI tests, scripts and comments that say the pages come after login.
4. Verify: `POS ADBDTests` on an erased Simulator, the UI tests on a visible Simulator, Android unit tests and `assembleDebug`, walks on a windowed AVD, screenshots in `~/Documents/AnyRent-shots/onboarding-before-login/`.

Skill: `mobile-parity`. No API skill applies, nothing under API paths changes.

## Files

- `apps/mobile/POS ADBD/Model/AppStartRoute.swift`, `apps/mobile/POS ADBDTests/AppStartRouteTests.swift`: the rule and its tests
- `apps/mobile/POS ADBD/Application/AppDelegate.swift`: routing
- `apps/mobile/POS ADBD/Viewcontrollers/Onboarding/*`, `Viewcontrollers/Auth/v2/LoginV2ViewController.swift`, `Viewcontrollers/Authenticate/LoginViewController.swift`: finish and login call the rule
- `apps/mobile/POS ADBD/Library/Managers/{PushNotificationManager,DraftOrderReminder}.swift`: `forceMain` removed
- `apps/mobile-android/.../domain/appstart/AppStartRoute.kt`, its test: the rule and its tests
- `apps/mobile-android/.../ui/navigation/AnyRentNavHost.kt`: routing
- `apps/mobile/POS ADBDUITests/*`, `scripts/mobile-e2e/*`, `.claude/skills/mobile-e2e-local/SKILL.md`: the new order

## Risks

- Android's recreated-activity check would skip the pages on every fresh install: covered by a test and by the walk.
- A UI test or script that logs in on a fresh install stops at the pages: all of them updated.

## Rollback

Revert the PR. The flag is untouched, so nobody sees the pages twice.
