# Spec — ngày thuê ở cột phải

Issue: #1291

- Đơn Cho thuê, màn >= 1100px: aside có nút ngày ngay sau thanh Cho thuê/Bán, trước ô Khách hàng. Nút đầu trang ẩn.
- Màn < 1100px: nút đầu trang như cũ; nút trong aside ẩn (không trùng).
- Đơn Bán: không có nút ngày ở cả hai nơi.
- Bấm nút mở DaysDialog như cũ. Chữ: `editor.daysButton` / `editor.pickDays`; chữ phụ `editor.cart.change` / `editor.cart.choose` (key có sẵn).
- Không đổi API, mobile, locales.
