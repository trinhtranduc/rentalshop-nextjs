# Spec: ảnh sản phẩm trong Top sản phẩm (#1243)

- API: không đổi. `topProducts[].image` = ảnh đầu tiên của sản phẩm hoặc `null` (`period-report.ts:987`).
- Web: `TopBar` có thêm `image`; `topBars` điền từ `TopProductLike.image`, `topCustomerBars` để `null`. `TopList` và `TopDrawer`: ô 32px (thẻ) / 36px (drawer) hiện `<img>` object-cover bo góc; không có ảnh hoặc ảnh lỗi thì giữ ô chữ cái đầu như cũ.
- iOS: `OverviewTopRow.image: String?` (mặc định nil); `topProductRows` điền; `OverviewTopRowView` hiện thumbnail 36pt bo 8 bên trái cho hàng sản phẩm (Kingfisher, placeholder `no-image`); dùng chung cho thẻ và "Xem tất cả".
- Android: `OVTopRow` nhận `image: String?` và `showThumb`; `TopCard` truyền `row.image` cho sản phẩm bằng `ProductThumb` (36dp, bo 8dp, placeholder sẵn có). "Xem tất cả" giữ nguyên (đã có 44dp).
- Test: Jest cho `topBars` (image), logic iOS và Android điền `image`.
