# #970 Plan

Status: in progress

1. Tests first, committed alone: iOS `PrinterSetupTests.swift` (configured IP, not-configured error before
   network, messages + Mac hint, auto print rule); Android `PrintFeedbackTest.kt` (blank IP →
   `NOT_CONFIGURED`, refused port → `CONNECT`).
2. iOS: `PrinterSetup`, `PrinterError.notConfigured` + `LocalizedError`, `PrintFeedback`, entry points,
   test print HUD, `Utils.loadBillPrinter`, strings vi/en, `NSLocalNetworkUsageDescription`.
3. Android: `Result.Failure.reason`, `PrintFeedback`, call sites, strings vi/en.
4. `scripts/virtual-printer/` + README.
5. Verify: iOS build + unit tests on a Simulator, Android assembleDebug + testDebugUnitTest; visible runs
   with the virtual printer (iPhone Simulator, Mac "Designed for iPad", emulator).
