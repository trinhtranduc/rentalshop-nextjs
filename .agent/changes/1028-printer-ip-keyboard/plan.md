# Plan — Printer IP keyboard has "."

Issue: #1028 · Status: in-progress · Spec: ./spec.md

## Steps

1. Failing unit tests (iOS `PrinterSetupTests`, Android `PrinterPrefsTest`) for the normaliser and keyboard type. Commit.
2. Add the helper and keyboard constant on both apps; use them in the IP fields (iOS form; Android old + v2 screens).
3. Unit tests, builds, visible check with the device in Vietnamese.
4. Skills: `bug-fix-tdd`, `mobile-parity`. No API change, so no `api-compat-review` log row.

## Files

- `apps/mobile/POS ADBD/Library/Managers/PrinterManager.swift` — `PrinterSetup.normalizedIP`, `ipKeyboardType`
- `apps/mobile/POS ADBD/Viewcontrollers/Settings/PrinterConfigurationViewController.swift`
- `apps/mobile/POS ADBDTests/PrinterSetupTests.swift`
- `apps/mobile-android/.../print/ThermalPrinter.kt` — `normalizeIp`, `IP_KEYBOARD`
- `apps/mobile-android/.../ui/settings/SettingsParity.kt`
- `apps/mobile-android/.../test/.../print/PrinterPrefsTest.kt`

## Risks

A full keyboard means letters can be typed; the iOS test-print regex still rejects them.

## Rollback

Revert the commits. Saved IPs are unchanged.
