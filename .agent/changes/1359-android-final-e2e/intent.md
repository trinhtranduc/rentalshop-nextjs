# Intent: e2e Android lượt cuối trước bản store 0.1.11 (#1359)

Status: done. Issue: #1359. Epic: #1309. Tiếp theo #1329.

## Muốn gì, vì sao
Chủ shop muốn XÁC NHẬN trên Android emulator (cửa sổ hiện) các thay đổi mới sau lượt e2e #1329 (ô tick "Hiện ở chi nhánh" #1346, gợi ý "Chi nhánh khác còn" #1353, công tắc và ghi chú đơn trên ảnh chia sẻ #1354, thứ tự tiền trên ảnh chia sẻ #1345, "Thu khi giao" ở chi tiết đơn #1350) cùng với các ca cũ, trước khi build Android 0.1.11 (versionCode 12).

## Ràng buộc
- Chỉ thêm kịch bản test và tài liệu. Không đổi code app/API (app cài sẵn không bị chạm).
- Chạy trên API cục bộ + DB riêng; emulator riêng có cửa sổ; không production.
- Chỗ app lệch quy tắc: ghi nhận, đề xuất issue riêng, không sửa trong lần chạy này.
