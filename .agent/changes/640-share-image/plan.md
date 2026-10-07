# Plan — #640 (one PR into dev)
1. iOS: `Model/OrderShareImage.swift` pure model (`OrderShareModel.from(order:)`, `.fromDraft(cart:)`) + tests in
   `POS ADBDTests/OrderShareImageTests.swift`; renderer `Utils/OrderShareRenderer.swift` (UIGraphicsImageRenderer,
   UIKit drawing, 2×); hook into `OrderDetailViewController.shareTapped`, `PreviewViewController.shareReceiptTapped`,
   cart header share in `CartV2ViewController`. Strings vi/en.
2. Android: `domain/orders/OrderShareModel.kt` + test; `ui/orders/OrderShareRenderer.kt` (Canvas, 2×) replacing the
   body of `shareOrderReceipt`; cart header share in `CartV2Screen`. Strings en/vi.
3. Verify: unit tests, builds; export the three images from each app on simulator / emulator against a local
   seeded API; compare with `mockups/`.
