# Intent: e2e Android đồng bộ cấu hình theo vai trò (#1329)

Status: in-progress. Issue: #1329. Epic: #1309. Tiếp theo #1315 / #1322 (iOS).

## Muốn gì, vì sao
Chủ shop muốn XÁC NHẬN trên máy thật (emulator có cửa sổ) rằng các thay đổi đồng bộ cấu hình theo vai trò (#1307, #1308, #1310, #1313, #1320) chạy đúng trên Android trước khi build bản store.

## Ràng buộc
- Chỉ thêm test, máy in giả và tài liệu. Không đổi code app/API (app cài sẵn không bị chạm).
- Chạy trên API cục bộ + DB riêng; emulator riêng có cửa sổ; không production.
- Chỗ app lệch quy tắc: ghi nhận, mở issue riêng, không sửa trong lần chạy này.
