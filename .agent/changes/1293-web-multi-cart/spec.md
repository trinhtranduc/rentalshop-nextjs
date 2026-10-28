# Spec — nhiều giỏ trên web

Issue: #1293

- Thanh tab (`role=tablist`) ở đầu trang Tạo đơn, dính trên cùng, cao 48px; cột phải dính ở top-12. Sửa đơn: không có thanh, giữ độ lệch cũ.
- Mỗi tab: avatar tròn (chữ đầu từ đầu + từ cuối; không khách: số giỏ, nền xám `#94A3B8`; có khách: màu theo số giỏ), tên (khách hoặc "Giỏ k"), "n món · tiền" (giỏ trống: "0 món"). Tab đang chọn có vạch xanh và ×.
- "+ Giỏ mới" cuối thanh; đủ 10 giỏ thì ẩn. Giỏ mới trống, dùng ngay, mang theo cửa hàng, mở hộp chọn ngày nếu là đơn thuê.
- Chuyển giỏ: không hỏi, giỏ cũ giữ nguyên. × luôn hỏi "Xoá giỏ này?" / "{tên} có {n} món. Các món sẽ bị xoá."; còn 1 giỏ thì xoá = làm trống. Đang bấm Tạo đơn thì khoá thanh.
- Lưu: localStorage `anyrent.draftCarts.<userId>` (try/catch), khôi phục khi vào lại; một giỏ trống duy nhất thì xoá khoá; ảnh ghi chú không lưu.
- Tạo đơn xong: hộp biên lai như cũ rồi sang trang đơn; giỏ vừa tạo bị đóng (còn 1 giỏ thì làm trống).
- `?pickup=&return=&productId=&bookingRequestId=`: giỏ đang dùng có món → mở giỏ mới; trống → dùng nó. Đủ 10 giỏ mà giỏ có món → không điền. Sau khi đọc, bỏ tham số khỏi URL (tải lại không tạo thêm giỏ).
- Không đổi API, mobile. i18n: `orders.web.editor.carts.*` trong locales/{en,vi,ja,ko,zh}.
