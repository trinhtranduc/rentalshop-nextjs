# Spec: nhiều giỏ hàng (#1079)

Mockup: artifact 9b56KwErJWiGpiyFEfyEY4, tab "Nhiều giỏ hàng", Cách 1.

## Quy tắc
1. `CartStore` giữ danh sách giỏ + giỏ đang dùng. Mọi chỗ đang đọc `CartStore.cart` đọc giỏ đang dùng (không đổi chỗ gọi).
2. Có đúng 1 giỏ: giao diện giống hiện nay.
3. Từ 2 giỏ, Trang chủ có thanh giỏ trên thanh tab: avatar (chữ cái đầu khách, hoặc số thứ tự nếu chưa có khách), tên giỏ 1 dòng cắt "…", "N món · tổng tiền", nút "Xem giỏ ›".
4. Bấm tên giỏ: bảng "Chọn giỏ" liệt kê các giỏ (tên, loại, số món, tổng tiền, ngày), giỏ đang dùng có dấu ✓, nút "+ Giỏ mới". Chọn một dòng: đổi giỏ và đóng bảng.
5. Bấm "Xem giỏ": mở màn giỏ như hiện nay. Từ 2 giỏ, đầu màn giỏ có hàng "Giỏ · tên · i/n · Đổi ⌄" mở cùng bảng chọn giỏ.
6. Giỏ chưa có khách tên "Giỏ k" (k = số thứ tự giỏ nhỏ nhất chưa dùng). Có khách thì tên = tên khách.
7. Nút "+" trên sản phẩm thêm vào giỏ đang dùng.
8. Tạo đơn thành công: xoá giỏ đó; giỏ kế tiếp thành giỏ đang dùng; nếu còn 1 giỏ thì giao diện về như hiện nay; nếu hết giỏ thì tạo giỏ trống.
9. Xoá giỏ (vuốt trong bảng chọn giỏ): luôn hỏi xác nhận. Xoá giỏ đang dùng chuyển sang giỏ kế tiếp.
10. Sửa đơn: dùng giỏ đang dùng như hiện nay (xác nhận 17/10).
11. Lưu trên máy theo tài khoản (UserDefaults / SharedPreferences). Dữ liệu cũ (1 giỏ) đọc được và trở thành giỏ đầu tiên. Số giỏ tối đa 10.
12. Icon xe đẩy ở hàng tiêu đề đổi thành icon giỏ; số trên icon = số món giỏ đang dùng (như hiện nay).

## API
Không đổi. Payload `POST /api/orders` giữ nguyên.

## Kiểm thử
- Unit: thêm/đổi/xoá giỏ, tên mặc định, tạo đơn xong giỏ tự đóng, đọc dữ liệu cũ 1 giỏ, giới hạn 10 giỏ.
- iOS: chạy trên simulator, mở bằng `open -a Simulator`. Android: emulator có cửa sổ.
