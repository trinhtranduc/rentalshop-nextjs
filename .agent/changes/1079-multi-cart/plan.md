# Plan (#1079)

1. iOS `CartStore`: `storage` → `carts: [Cart]` + `activeIndex`; `cart` trả giỏ đang dùng; API mới `newCart`, `switchCart`, `deleteCart`, `closeActiveAfterOrder`. Lưu đĩa: khoá mới `anyrent.draftCarts.<userId>`; đọc khoá cũ nếu chưa có khoá mới. Test trước.
2. iOS Trang chủ: thanh giỏ + bảng "Chọn giỏ" + icon giỏ. Màn giỏ: hàng "Giỏ · Đổi".
3. iOS: tạo đơn xong gọi `closeActiveAfterOrder`; xoá giỏ có xác nhận; chuỗi vi/en trong `Localizable.strings` (nối bằng `cat >>`, kiểm tra `wc -l`).
4. Android: `CartStore.kt` theo đúng hành vi iOS; Compose: thanh giỏ, bottom sheet, hàng "Giỏ · Đổi"; chuỗi vi/en.
5. Kiểm: unit test cả hai, e2e trên simulator/emulator (có cửa sổ), chụp màn hình so với mockup.
6. PR vào `dev`, nội dung tiếng Việt, `Fixes #1079`; bảng `## API compatibility` ghi "không đổi API"; thêm dòng LOG.md.
