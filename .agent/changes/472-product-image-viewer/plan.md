# Plan — #472

1. iOS logic: `ProductImages` in `Model/ProductsV2.swift` (+ `ProductImageViewerRequest`). Tests in
   `POS ADBDTests/ProductsV2Tests.swift`.
2. iOS viewer: `Viewcontrollers/Products/v2/ImageViewerViewController.swift`, a shared full-screen viewer built from
   the note preview (black, X button) plus paging `UIScrollView` pages that zoom, Kingfisher loading, swipe-down
   dismiss. Add it to the Xcode project.
3. iOS screens: `ProductDetailViewController` tap on the photo → viewer at the current page;
   `ProductRowV2Cell` thumbnail tap → `onImage` closure → `ProductsHomeViewController` presents the viewer.
4. Android logic: `ProductImages` in `domain/products/ProductRules.kt`; unit tests under `app/src/test`.
5. Android viewer: extend `ui/common/FullScreenImagePreview.kt` with a list overload (HorizontalPager + pinch and
   double-tap zoom); the single-model call delegates to it so old callers keep working.
6. Android screens: `ProductDetailScreen` photo clickable → viewer at the current page; `ProductsHomeScreen`
   `ProductRow` thumbnail clickable when a request exists.
7. Strings: iOS `en.lproj` / `vi-VN.lproj`, Android `values` / `values-vi` (i18n-keys; mobile only, no web key).
8. Verify: iOS build + `POS ADBDTests` on a spare simulator; Android
   `./gradlew :app:testDebugUnitTest :app:assembleDebug`.
