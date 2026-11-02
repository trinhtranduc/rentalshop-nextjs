# Intent: tài khoản ngân hàng chỉ chủ shop sửa (#1319)

Status: in-progress. Issue: #1319. Epic: #1309.

## Muốn gì, vì sao
Chủ shop chốt (2026-10-29): chỉ chủ shop thêm, sửa, xoá, đặt mặc định tài khoản ngân hàng. Đây là nơi tiền chuyển về, nên quản lý chi nhánh và nhân viên chỉ xem. Nhân viên vẫn cần tài khoản mặc định để in QR.

## Ràng buộc
- App cài sẵn không ép cập nhật được: quản lý chi nhánh trên app cũ phải thấy lỗi rõ ràng, không crash, không mất dữ liệu. Đã rà trên `origin/main-real`, kết quả ở comment của issue.
- `ADMIN` giữ quyền như hiện tại. `GET` không đổi.
- Không có giao diện mới: cùng màn, bỏ các nút với quản lý chi nhánh, nên không cần mockup.
