# Intent — plannedAmount cho giai đoạn thu lúc tạo đơn (#1230)

Issue: #1230 (tiếp #1219 / PR #1220)

Giai đoạn 1 thu cùng lúc tạo đơn (`collectFirstNow`) không ghi `plannedAmount` vào `Payment.metadata`, nên tăng tổng đơn RESERVED vẫn làm giai đoạn 1 thành `PARTIAL`. Đây là luồng chính của web và app mới.

Ràng buộc: tối thiểu, một hàm dùng chung cho mọi chỗ ghi Payment giai đoạn (chỉ có 2: tạo đơn và `collect`), không đổi field API, không migration, không migrate dữ liệu cũ.
