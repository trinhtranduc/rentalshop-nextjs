# #1408 Không hiện lỗi server cho người dùng

Chủ sản phẩm: "tại sao hiện lỗi cho user là lỗi này check đảm bảo không được phép hiện cho user lỗi này".

Ảnh 14:58 ngày 2026-10-31: alert trên tab My Order hiện đường dẫn server, SQL và mã bundle.

Muốn: không response nào của API mang text exception; app đã cài không đổi được nên API là lớp chính; app mới có lớp thứ hai. Không đổi hình dạng response, chỉ đổi code ở một chỗ có lý do (lỗi DB lúc xác thực).
