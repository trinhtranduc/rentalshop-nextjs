# Spec — Chủ shop nhận thông báo đơn của mọi chi nhánh

Issue: #1639 · Status: draft · Intent: ./intent.md

## Behavior
Shop M: chi nhánh A, B, C. Chủ shop `O` (MERCHANT, `outletId` = A). Nhân viên `SA` (A), `SB` (B), quản lý `AB` (OUTLET_ADMIN, B). C không có nhân viên.

| # | Sự kiện | Nhận hôm nay | Nhận sau khi sửa |
|---|---|---|---|
| 1 | Đơn mới ở A (SA tạo) | SA, O | SA, O (O một bản) |
| 2 | Đơn mới ở B (SB tạo) | SB, AB | SB, AB, O |
| 3 | Đổi trạng thái đơn ở C | không ai | O |
| 4 | O tự tạo đơn ở B | SB, AB | SB, AB, O |
| 5 | Shop chỉ có chi nhánh A | SA, O | SA, O (một bản mỗi người) |
| 6 | Chủ shop đã khoá hoặc đã xoá | — | không nhận |
| 7 | Shop khác M2 có đơn | chỉ người của M2 | chỉ người của M2 (O không nhận) |
| 8 | Yêu cầu đặt thuê công khai ở B | SB, AB, O | không đổi |

1. Người nhận = user hoạt động của chi nhánh ∪ MERCHANT hoạt động của merchant chi nhánh đó, không trùng.
2. Hộp thư và push dùng cùng danh sách người nhận (push theo thiết bị của các user đó).
3. Shop có từ 2 chi nhánh (đang hoạt động): `body` thêm " · {tên chi nhánh}" cho mọi người nhận. Shop 1 chi nhánh: nội dung như cũ.
4. `type`, `title`, `data` không đổi.
5. Lỗi khi lấy người nhận hoặc gửi không làm hỏng việc tạo hay đổi trạng thái đơn (như hiện nay).

## Out of scope
Chủ shop chọn chi nhánh muốn nhận; loại thông báo khác (ca làm, gói, yêu cầu đặt thuê); đổi app.

## API and data
Không field mới, không migration. Phạm vi merchant theo `outlet.merchantId`.

## Acceptance
- [ ] Mỗi dòng trong bảng có một test (`tests/api/order-notification-recipients.test.ts`)
- [ ] iOS/Android: không đổi (không dùng `outletId` trong push)
