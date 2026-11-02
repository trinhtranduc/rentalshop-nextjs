# Plan #1419

Skills: mobile-parity.

1. Test first: `OrderPhotoLogic.returnSheetShowsPhotos`, iOS and Android; UI test on iOS.
2. iOS: `OrderHandOverSheetViewController`, `OrderDetailViewController.presentSheet`. Android: `OrderPhotoBlock.kt` shared row, `ReturnSheet`, `OrderDetailV2Screen`.
3. Verify: `POS ADBDTests`, `testDebugUnitTest`, `assembleDebug`; UI with 0 and 3 photos on a visible Simulator and AVD.
