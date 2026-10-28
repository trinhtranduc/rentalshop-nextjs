# Spec

- Bỏ tiêu đề "Đơn #số" khỏi sheet; giữ nút đóng (iOS có accessibilityIdentifier `order.sheet.close`).
- Mô tả mỗi dòng (vi): Chia sẻ "Ảnh hoá đơn để lưu hoặc gửi"; Ghi chú chưa có "Thêm ghi chú hoặc ảnh cho đơn", đã có giữ "Có N ghi chú · M ảnh"; Sửa đơn "Đổi món, ngày thuê, khách"; Gia hạn "Thêm ngày thuê, tính thêm tiền"; Lịch sử chưa có "Ai sửa gì, lúc nào", đã có giữ "N lần thay đổi · gần nhất ..."; In hoá đơn giữ như app (tên máy in); Huỷ đơn "Huỷ đơn, xử lý tiền cọc nếu có"; Xoá đơn "Xoá hẳn đơn đã huỷ, không hoàn tác được".
- Màu mô tả: màu chữ phụ sẵn có của app (không đổi).
- Điều kiện hiện từng dòng: không đổi (`OrderDetailLogic.sheetActions`, `OrderActionSheet.rows`).
- Android: thêm mô tả cho Chia sẻ và Xoá (trước chưa có).
## Không đổi API / web.
