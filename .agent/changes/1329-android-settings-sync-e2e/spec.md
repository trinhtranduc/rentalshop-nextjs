# Spec: Android settings-sync e2e (#1329)

`tests/e2e/mobile/android-flows.sh settings-sync <case> [role]`:

| Ca | Vai trò | Kiểm |
|---|---|---|
| `rows` | merchant, manager, staff, kho | dòng Cài đặt từng vai trò: tên "Thông tin cửa hàng/chi nhánh", Cọc chỉ chủ shop (#1310), Tài khoản ngân hàng (#1319 ghi nhận), công tắc trùng lịch chỉ chủ shop |
| `shopinfo` | manager, staff, kho | form chi nhánh: quản lý sửa được và lưu vào DB, nhân viên/kho chỉ xem, không nút Lưu (#1313) |
| `owner` | merchant | form shop + chi nhánh bằng giao diện (chi nhánh tắt bị ẩn, chi nhánh chính đầu, lưu vào DB), đổi tiền tệ bằng giao diện |
| `owner-bills` | merchant | sửa ghi chú in + QR bằng giao diện, hoá đơn lấy từ `order.outlet`, công tắc trùng lịch |
| `print` | manager, staff, kho | ghi chú/QR chỉ đọc, IP/cổng máy in tự cài, hoá đơn in (byte ESC/POS bắt ở máy in giả) mang ghi chú và khối ngân hàng |
| `bankcache` | staff | đổi tài khoản mặc định bằng API: in lần sau vẫn tài khoản cũ (cache 5 phút), sau khi app về nền rồi lên lại thì tài khoản mới (#1320) |
| `currency-fg` | staff, manager, kho | #1307: đổi tiền tệ bằng API, không mở lại app: foreground (`onResume`) hoặc vào Tổng quan, cách nhau hơn 1 phút |
| `overlap` | staff, manager | tắt/bật "Cho trùng lịch" bằng API, giỏ của máy thử theo |
| `deposit` | cả bốn | Cọc ẩn với vai trò khác chủ shop |

Công cụ: `tests/e2e/mobile/escpos-capture.py` (máy in giả TCP), `settings-sync-api.js bank …`, `adb-ui.sh` (dump có watchdog, không đọc lại màn hình cũ).
