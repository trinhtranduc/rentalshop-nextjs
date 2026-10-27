# Form sản phẩm: một lựa chọn Theo lần / Theo ngày

Issue: #1249 · Author: Trinh Tran · Status: chủ đã chọn phương án A · Created: 2026-10-27

## Problem
Form sản phẩm có công tắc "mặc định tính", hai ô giá, một dòng block mở màn riêng và trong màn đó là danh sách 3 radio. Chủ shop thấy rối: "cần thiết kế lại chỗ tạo product default là theo lần, nếu chọn theo ngày sẽ quay qua mục block luôn, bỏ switch".

## Proposed outcome
- Một lựa chọn duy nhất: Theo lần / Theo ngày. Sản phẩm mới mặc định Theo lần.
- Theo ngày = bảng block ngay trên form (không màn riêng). Không còn công tắc "mặc định tính", không còn 3 radio.
- Sản phẩm DAILY cũ không có bảng mở lại mềm: chọn sẵn Theo ngày, dòng ngày 1 điền sẵn giá ngày cũ, không sửa thì lưu như cũ.
- Không đổi API.

## Affected users and systems
MERCHANT, OUTLET_ADMIN, OUTLET_INVENTORY (sửa giá). web client, iOS, Android.

## Constraints
App cài sẵn trên main-real không đổi; bản block (#1189) chưa lên production (release #1228). Chỉ đổi giao diện nhập. Đơn giản, đừng thêm điều khiển.

## Decision log
- 2026-10-27 — Chủ: "bỏ switch"; chọn A: giữ ô perDay/DAILY cũ đọc được, bỏ cả công tắc ở form và 3 radio ở màn block; "cọc theo lần" hiểu là giá thuê theo lần. Đổi ý so với #1189 spec mục 1 và 21 (danh sách 3 radio, form chỉ một dòng trung tính).
