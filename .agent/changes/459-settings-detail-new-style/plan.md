# Plan — Settings detail pages in the new UI style

Issue: #459 · Status: in progress · Spec: ./spec.md

Base `origin/dev`, branch `feat/459-settings-detail-new-style`, one PR into `dev`.

## Steps

1. Before screenshots on a spare simulator (temporary, uncommitted UI-test tour against the local API).
2. iOS shared pieces in `apps/mobile/POS ADBD/Viewcontrollers/Settings/SettingsDetailV2.swift`
   (header, value/check row cell, user row cell, labelled field, bottom bar). Added to the Xcode project.
3. iOS pages, each with `var v2 = false` and a v2 layout branch; legacy layout code untouched:
   `AccountViewController`, `PrinterConfigurationViewController`, `UserManagementViewController`,
   `UserFormViewController`, `ExportViewController`, `AppInformationViewController`.
   `SettingsV2ViewController.open(_:)` sets `v2 = true`.
4. Android shared pieces in `ui/settings/v2/SettingsDetailV2.kt` (header, field, buttons, rows).
5. Android pages get `v2: Boolean = false`: `StoreInfoScreen`, `PrinterNetworkScreen`, `UserManagementScreen`,
   `UserFormScreen`, `ExportAuthScreen`, `AppInfoScreen`. `AnyRentNavHost` passes
   `MobileFeature.NEW_SETTINGS in features`.
6. After screenshots with the same tour; remove the temporary test.

No logic is extracted, so no new unit tests: the UI-only restyle is proven by builds, the existing unit
tests and screenshots. Domain skills: `mobile-parity` (both apps, same behaviour); `i18n-keys` not needed
(existing strings only).

## Verify

```bash
cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath <worktree>/build-tmp/DerivedData build
xcodebuild ... -destination 'platform=iOS Simulator,id=<spare>' -only-testing:"POS ADBDTests" test
cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
```

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Settings/*.swift` — v2 branch per page, shared v2 pieces
- `apps/mobile/POS ADBD.xcodeproj/project.pbxproj` — new file reference
- `apps/mobile-android/.../ui/settings/*.kt`, `ui/settings/v2/SettingsDetailV2.kt`, `ui/navigation/AnyRentNavHost.kt`

## Risks

- Flag-off regression: legacy layout functions stay as they are; the v2 branch returns early.
- Both apps change in one PR; no API change, so installed apps are unaffected.

## Rollback

Revert the PR, or turn `newSettings` off on the API (`MOBILE_FEATURES`), which shows the old Settings and pages.
