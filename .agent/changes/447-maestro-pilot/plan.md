# Plan — Maestro pilot for mobile e2e

Issue: #447 · Status: draft · Spec: ./spec.md

Base `dev`, branch `feat/447-maestro-pilot`, one PR into `dev`.

## Steps

1. Check Maestro CLI (`/opt/homebrew/bin/maestro`, `maestro --version`; needs Java — use
   `JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"` if system Java is missing).
2. Stack: export the skill's `E2E_*` values, `seed-local.sh`, `api-local.sh start --build` with the new-UI
   `MOBILE_FEATURES`. Build/install the apps the same way `ios-e2e.sh` / `android-e2e.sh` do
   (Android `-PapiBaseUrl=http://10.0.2.2:<port>`; iOS debug pointing at the local API as `ios-e2e.sh` sets it).
3. Write `apps/mobile-e2e-maestro/flows/rent-handover.yaml` with text selectors first (vi labels, en fallback).
   Add an accessibility id (iOS `accessibilityIdentifier`, Android `Modifier.testTag` + `testTagsAsResourceId`) only
   where text is ambiguous; same id on both apps.
4. Write `scripts/mobile-e2e/maestro-e2e.sh` (`--help`, `--platform`, `--runs`, emulator guard, output to `$E2E_OUT/maestro`).
5. Measure: 5 runs per platform with Maestro; 5 runs of XCUITest `test2CartRent`+`test5OrderDetailActions` and of the
   adb scenario; Vietnamese search on Android. Fill "Results".
6. Update `.claude/skills/mobile-e2e-local/SKILL.md` with a short "Maestro (pilot)" section only if the result is go.

## Verify

```bash
scripts/mobile-e2e/maestro-e2e.sh --platform ios --runs 5
scripts/mobile-e2e/maestro-e2e.sh --platform android --runs 5
scripts/mobile-e2e/ios-e2e.sh --only test2CartRent   # baseline
```
If app code gets ids: iOS `xcodebuild … build`, Android `./gradlew :app:assembleDebug`, both unit test suites.

## Results

_To fill after step 5._

| | Maestro iOS | Maestro Android | XCUITest | adb |
|---|---|---|---|---|
| Passes / 5 | | | | |
| Time per run | | | | |
| Vietnamese input | | | n/a | no (ASCII only) |
| Ids added | | | | |

Recommendation: _go / no-go, and why._

## Risks

- Single-session login: a parallel run with the same account logs the app out → one account per device.
- Disk: derived data and emulator images; stop below 6 GB free.

## Rollback

Delete the new folder and script. Ids added to the apps are harmless.
