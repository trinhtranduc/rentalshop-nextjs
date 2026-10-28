# Plan (#1243)

1. Test đỏ: `topBars` mang `image`; iOS `topProductRows` mang `image`; Android `topProductRows` đã có (giữ test).
2. Web: model + TopList + TopDrawer.
3. iOS: model + row view.
4. Android: OVTopRow + TopCard.
5. Chạy: Jest (2 TZ), locales-valid-json, mobile-error-catalog, web tsc, iOS unit test, Android testDebugUnitTest.
6. Chụp web trước/sau; mobile nếu làm được.
7. PR vào dev, `Fixes #1243`, bảng API compatibility "No API change".
