# Plan — #622 (one PR into dev, iOS first, then Android)

## Test vectors
Generate 3 vectors with the web helper (`packages/utils/src/core/bank-qr.ts` `generateVietQRString`, no amount): e.g. Vietcombank 0123456789 "NGUYEN VAN A", Techcombank 19036781234015 "TRAN THI B", MB Bank 0901234567 "LE C". Store them in both test suites.

## iOS (apps/mobile/POS ADBD) — reference
1. `Utils/VietQR.swift`: EMV builder + CRC16; BIN lookup from `VietnamBankCodes.swift` (add BINs if missing, same table as web). Unit tests with the vectors.
2. Settings: add `.bankAccounts` to `SettingsV2Item` Store group (`Model/SettingsV2.swift`), route in `SettingsV2ViewController`; re-enable the old row (`SettingsViewController.swift:140`). Hide for OUTLET_STAFF.
3. `PrinterConfigurationViewController`: switch under Printer Notes; `Utils` key `printBankQr` (Bool, default false).
4. `Order.toPrintData()` / `PrinterManager.printOrder`: when on, load default account (`BankAccountService` list → `isDefault` else first; cache for the session) and append text + `PrinterCommand.printQRCode`. Off → unchanged bytes (unit test).
5. Strings vi/en. Build + unit tests; screenshots of Settings row, list, form, printer switch.

## Android (apps/mobile-android) — match iOS
1. `util/VietQr.kt` + JUnit vectors.
2. Bank account API in the repository layer (same routes), list/form/bank picker screens (Compose, v2 style), nav route, Settings row (`SettingsRows.kt`, `SettingsV2Screen.kt`, old `SettingsScreens.kt`), hidden for staff.
3. `PrinterNetworkScreen`: switch, SharedPreferences `anyrent.printer/printBankQr` default false.
4. `print/ThermalPrinter.kt`: ESC/POS QR (`GS ( k` store/print), text lines; off → unchanged bytes (JUnit).
5. Strings vi/en. `./gradlew :app:testDebugUnitTest :app:assembleDebug`; screenshots on emulator.

## Verify
iOS build + tests; Android unit tests + assemble; manual print preview (bytes dump) for on/off. No API change → no `LOG.md` row; PR states "API compatibility: none".
