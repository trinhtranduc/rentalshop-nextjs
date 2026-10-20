# Plan — #1137

1. Strings en/vi on iOS and Android (chip, titles, new sheet keys).
2. iOS: `BookingRejectSheetViewController` in `BookingRequestDetailViewController.swift`; present as sheet; update UI test to tap reason then send.
3. Android: replace the two AlertDialogs with one `ModalBottomSheet` in `BookingScreens.kt`.
4. Verify: xcodebuild, gradle assembleDebug + BookingLogicTest, screenshots on Simulator and emulator.
