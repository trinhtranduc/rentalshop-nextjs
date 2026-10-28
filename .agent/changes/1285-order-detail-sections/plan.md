# Plan

1. iOS: tách `render()` thành các section có dải xám; `itemRow` kiểu B; `moneyRows` thành Tạm tính + Thanh toán + cọc; collateral section thêm dòng trả lại. Chuỗi mới vào Localizable.strings (en, vi-VN). Cập nhật unit test.
2. Android: `DetailBody`/`ItemRow` theo iOS; strings.xml (values, values-vi); cập nhật test.
3. Chạy test hai nền tảng, chụp Simulator và emulator (cửa sổ hiện), đối chiếu mockup, thêm ảnh vào `shots/`.
4. PR vào dev, `Fixes #1285`; cài Debug lên iPhone "Trinh Tran".
