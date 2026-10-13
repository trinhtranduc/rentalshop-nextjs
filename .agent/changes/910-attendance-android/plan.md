# Plan — Android attendance clock in / out and my shifts

Issue: #910 · Status: accepted · Spec: ./spec.md

## Steps

1. Domain + tests (`domain/attendance/AttendanceLogic.kt`, `AttendanceLogicTest.kt`): modules parse, me / punch /
   week / month parse (nullable-safe), rejection mapping, VN week days, text formats.
2. Data: `SessionStore.modules`; login + profile parse `merchant.modules`; `AppError.Http.data`;
   `data/AttendanceApi.kt` (me, punch, shifts, month).
3. UI `ui/attendance/`: `AttendanceScreen` (card, one button, results, permissions), `AttendanceScanScreen`
   (CameraX + ML Kit QR, location fix, debug code entry), `MyShiftsScreen`; `AttendanceLocation` (fix + isMock).
4. Wiring: Settings V2 + old Settings first row; routes in `AnyRentNavHost`; `ACCESS_FINE_LOCATION` /
   `ACCESS_COARSE_LOCATION` in the manifest; push + inbox `SHIFT_CHANGED` → my shifts.
5. Strings `values`, `values-vi` (skill `mobile-parity`; iOS copy when #909 lands).
6. Verify: `./gradlew :app:assembleDebug :app:testDebugUnitTest`; e2e (`mobile-e2e-local`) on `anyrent_e2e`
   :5570 with the #907 API on :3193, DB `anyrent_att_android`; screenshots vs mockup.

## Files

- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/attendance/*` — rules, parsing
- `.../data/AttendanceApi.kt`, `SessionStore.kt`, `ApiClient.kt`, `data/model/Models.kt`, `domain/error/AppError.kt`
- `.../ui/attendance/*`, `ui/settings/v2/SettingsV2Screen.kt`, `ui/settings/SettingsScreens.kt`, `ui/navigation/AnyRentNavHost.kt`
- `.../push/AnyRentFirebaseMessagingService.kt`, `MainActivity.kt`, `ui/inbox/*`
- `app/src/main/AndroidManifest.xml`, `res/values*/strings.xml`
- `app/src/test/.../domain/attendance/AttendanceLogicTest.kt`

## Risks

- API #907 not merged yet: parsing tolerant; e2e waits for its branch.
- Location on emulator: `adb emu geo fix`; mock via `cmd location providers` test provider.
- Old API (no `merchant.modules`): row hidden — nothing changes for current shops.

## Rollback

Revert the PR. No data or API change; the row disappears.
