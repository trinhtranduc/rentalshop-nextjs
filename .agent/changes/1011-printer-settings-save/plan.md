# Plan — printer settings stick after Save

Issue: #1011 · Status: in progress · Spec: ./spec.md

## Steps

1. Failing tests: iOS `POS ADBDTests/PrinterSetupTests` (#1011 cases), Android `print/PrinterPrefsTest`.
2. iOS: `Utils.saveBillPrinter` writes the marker; `PrinterSetup.configuredIP(saved:chosen:)` keeps `.199` when chosen;
   `CreatedOrderAutoPrint.run` uses `PrinterSetup.savedIP`.
3. Android: `ThermalPrinter.configFromPrefs` keeps a blank note and trims the IP; `PrinterNetworkScreen` reads the
   note the same way and trims the IP on save; the Settings v2 row shows the saved note.
4. Verify: iOS build + PrinterSetupTests / OrderDetailLogicTests; Android assembleDebug + PrinterPrefsTest + print tests.

## Files

- `apps/mobile/POS ADBD/Utils/Utils.swift`, `Library/Managers/PrinterManager.swift`
- `apps/mobile-android/.../print/ThermalPrinter.kt`, `ui/settings/SettingsParity.kt`, `ui/settings/v2/SettingsV2Screen.kt`

## Risks

- iOS devices with a stale `.199` and no marker keep showing "Chưa cài" until the user saves once (intended, #970).

## Rollback

Revert the PR; settings keys are unchanged, so nothing to migrate.
