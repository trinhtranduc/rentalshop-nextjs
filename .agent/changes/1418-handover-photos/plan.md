# Plan #1418

Skills: mobile-parity, i18n-keys (mobile: en + vi only).

1. Tests first: iOS `OrderPhotoQueueTests`; Android `OrderPhotoLogicTest`, `OrderPhotoQueueTest`, `OrderPhotoUploaderTest`, parser test.
2. iOS: `ViewModels/OrderPhotoQueue.swift` (rule + disk), `Library/Services/OrderPhotoUploader.swift`, `OrderService.uploadOrderPhotos`, `Viewcontrollers/OrderDetail/OrderPhotoBlockView.swift`; wire `OrderHandOverSheetViewController` and `OrderDetailViewController`; strings.
3. Android: `domain/orders/OrderPhotoLogic.kt`, `data/OrderPhotoQueue.kt`, `data/OrderPhotoUploader.kt`, `ApiParity.uploadOrderPhotos`, `ui/orders/v2/OrderPhotoBlock.kt`, camera dialog; wire sheet, ViewModel, screen; strings.
4. Verify: `POS ADBDTests`, Development build, `./gradlew :app:testDebugUnitTest :app:assembleDebug`; UI on a visible Simulator and AVD against local API, Homebrew DB, fake S3.
