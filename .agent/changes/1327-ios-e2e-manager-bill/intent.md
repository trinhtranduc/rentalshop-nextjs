# Intent: e2e iOS cho Quản lý chi nhánh, chủ shop sửa bằng giao diện, dữ liệu hoá đơn của máy nhân viên (#1327)

Status: in-progress. Issue: #1327. Epic: #1309.

## Muốn gì, vì sao
Chủ shop muốn xác nhận trên máy thật (Simulator) trước khi build bản store rằng cấu hình theo vai trò đồng bộ: chủ shop đổi tiền tệ, Cho trùng lịch, ghi chú in, QR; Quản lý chi nhánh, nhân viên, nhân viên kho thấy đúng; hoá đơn của máy nhân viên mang đúng ghi chú và tài khoản ngân hàng mặc định, kể cả sau khi chủ shop đổi tài khoản ở máy khác (#1320).
Test đang có chưa chạy được cho Quản lý chi nhánh (`--account` chỉ có merchant/staff/inventory) và không kiểm dữ liệu hoá đơn (ảnh chia sẻ không đọc chữ được).

## Ràng buộc
- Chỉ thêm test và script, không đổi code app, không đổi API (không ảnh hưởng app cài sẵn).
- Chạy trên API và DB cục bộ, không production.
