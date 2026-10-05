# Plan — Maestro pilot for mobile e2e

Issue: #447 · Status: pilot done · Spec: ./spec.md

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

Run on 2026-10-05, local stack (seeded `anyrent_mobile_e2e`, API :3180, all new-UI flags), Maestro 2.11.0.
Flow: `apps/mobile-e2e-maestro/flows/rent-handover.yaml` (one file for both platforms).

| | Maestro iOS (iPhone 17 Pro Max, iOS 26.2) | Maestro Android (AVD anyrent_w391, vi-VN) | XCUITest | adb |
|---|---|---|---|---|
| Passes / 5 | **5/5** | **5/5** | not re-run in the pilot | not re-run in the pilot |
| Time per run | 117–125 s | 143–161 s | — | — |
| Vietnamese input ("CCCD Nguyễn Văn Á") | yes | **yes** | yes | no (ASCII only) |
| Ids used / needed | 1 used (`handOver.papers`); 3 positional selectors | 0 ids; label tap for papers | — | — |

Platform differences handled in the flow (only 3 `when: platform` branches):
date picker (iOS bare day numbers, Android "Hôm nay" cells), keyboard hiding (Android only, and only while
the keyboard is visible), papers field (iOS id, Android label).

Pitfalls found while writing the flow:
- Steps report COMPLETED on the wrong screen unless the flow asserts the outcome → every flow ends with an assert.
- iOS `hideKeyboard` tapped "Quên mật khẩu?"; Android `hideKeyboard` presses Back and closed a sheet.
- `maestro hierarchy` on iOS returned a stale screen once; screenshots are the source of truth.
- A clean install shows the old login until the app-config is cached → the flow relaunches once and fails
  if the new screen ("Xin chào") is not shown.

App differences found (iOS vs Android), for the owner to decide:
1. Android pre-fills rental dates (today → tomorrow, "2 ngày"); iOS starts empty ("Chọn ngày thuê").
2. Review screen: iOS "Danh sách Sản phẩm" + a deposit sheet; Android "Xem trước đơn hàng / SẢN PHẨM", no sheet.
3. Android hand-over sheet has "Phương thức thanh toán"; iOS does not.
4. Android login: the keyboard covers the password field and the button (form does not scroll).

Recommendation: **go** — one flow file passed 5/5 on both platforms, typed Vietnamese on Android, and needed
only three platform branches. Next: P0 smoke flows from `test-cases.md`, and shared accessibility ids
(password, phone, name fields, cart CTA; Android `handOver.papers`).

## Risks

- Single-session login: a parallel run with the same account logs the app out → one account per device.
- Disk: derived data and emulator images; stop below 6 GB free.

## Rollback

Delete the new folder and script. Ids added to the apps are harmless.
