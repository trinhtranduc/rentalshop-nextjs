# Spec: ca mới của `android-flows.sh settings-sync` (#1359)

| Ca | Vai trò | Kiểm |
|---|---|---|
| `listing` | merchant, manager, kho, staff, onebranch | #1346: Home chủ shop có nhãn "Chưa hiện ở chi nhánh này" và không nút +; vai trò khác không thấy món bỏ tick, món tick tồn 0 vẫn hiện "Hết hôm nay"; chủ shop tick/bỏ tick (lưu vào DB, bỏ tick không bị chặn, có dòng nhắc); quản lý/kho ô tick mờ "Chỉ chủ shop bật/tắt", bấm không đổi; nhân viên dòng mờ ở chi tiết; shop một chi nhánh không có ô tick; đơn đang mở của món bỏ tick vẫn mở được |
| `othbr` | merchant, manager, kho, staff, onebranch | #1353: dưới dòng hết hàng trong giỏ "Chi nhánh khác còn: A (3), B (1)" (một ngày và nhiều ngày); nhân viên không có dòng và app không gọi `other-outlets-availability` (đếm dòng log API); shop một chi nhánh không gợi ý |
| `sharenote` | cả bốn | #1354: công tắc "Hiện ghi chú đơn trên ảnh chia sẻ" trong In & phiếu: chỉ chủ shop gạt, vai trò khác mờ "Chỉ chủ shop bật/tắt." |
| `share` | cả bốn | #1345 / #1350 / #1354: đơn cọc theo đợt 1.150.000 (đợt 1 đã thu 230.000, đợt 2 345.000): "Thu khi giao" 575.000 ở chi tiết, ảnh chia sẻ thật (lấy từ `cache/receipts`) khi đợt 2 chưa thu và đã thu, ghi chú đơn theo công tắc đổi từ "máy khác" |

Công cụ mới: `tests/e2e/mobile/order-fixtures-api.js` (đơn cọc theo đợt, thu đợt 2, đơn nhiều ngày; chạy bằng vai trò không đứng trên máy), `settings-sync-api.js set|get sharenote`.
