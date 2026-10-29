# Android: đồng bộ cấu hình theo vai trò, kết quả chạy emulator (#1329, epic #1309)

Chạy ngày 2026-10-29 trên `origin/dev` `8d7ae60dd` (đã gồm #1307, #1308, #1310, #1313, #1320, #1321). Emulator `e2e_android_1309` (Pixel 2, Android 14, cửa sổ hiện), tiếng Việt, API cục bộ (`MOBILE_FEATURES` đủ, có `newSettings`) + DB riêng `anyrent_e2e_android`. Chủ shop đổi cấu hình bằng API (giả lập máy khác); máy thử đăng nhập bằng giao diện. Mỗi vai trò đăng nhập một phiên (đăng nhập chủ shop bằng API làm máy chủ shop bị đăng xuất).

## Chuẩn bị

```bash
export E2E_DATABASE_URL=postgresql://<you>@127.0.0.1:5432/anyrent_e2e_android E2E_API_PORT=3270 E2E_AVD=e2e_android_1309 E2E_AVD_PORT=5590 E2E_OUT=<scratch>
scripts/mobile-e2e/seed-local.sh && scripts/mobile-e2e/api-local.sh start --build && scripts/mobile-e2e/prepare-accounts.sh staged
scripts/mobile-e2e/android-e2e.sh --fresh                      # cài app, AVD có cửa sổ (không -no-window)
python3 -I tests/e2e/mobile/escpos-capture.py 9291 $E2E_OUT/printer &    # máy in giả: giữ nguyên byte ESC/POS (emulator gọi 10.0.2.2)
node tests/e2e/mobile/settings-sync-api.js bank create "NGUYEN VAN A" 0123456789 Vietcombank true VCB
node tests/e2e/mobile/settings-sync-api.js bank create "TRAN THI B" 9876543210 Techcombank false TCB
LANG_E2E=vi tests/e2e/mobile/android-flows.sh settings-sync <ca> [merchant|manager|staff|kho]
```
Giới hạn đăng nhập của API là 10 lần / 15 phút theo IP: khi `login_as` báo không vào được tab bar, khởi động lại API.

## Kết quả

| Ca | Chủ shop | Quản lý CN | Nhân viên | Kho | Cách kiểm |
|---|---|---|---|---|---|
| Dòng Cài đặt theo vai trò (`rows`) | ĐẠT | ĐẠT (ghi nhận #1319) | ĐẠT | ĐẠT | văn bản màn hình |
| Cọc ẩn với vai trò khác chủ shop (#1310) | ĐẠT (thấy) | ĐẠT (ẩn) | ĐẠT (ẩn) | ĐẠT (ẩn) | `rows` |
| Tiền tệ: chủ shop đổi bằng giao diện (#1313) | ĐẠT | - | - | - | DB |
| Tiền tệ: máy khác thấy khi về foreground / vào Tổng quan, > 1 phút (#1307) | - | ĐẠT (Tổng quan) | ĐẠT (foreground) | ĐẠT (foreground) | `currency-fg`, đổi VND ↔ USD hai chiều |
| Ghi chú in + QR: chủ shop sửa bằng giao diện | ĐẠT | - | - | - | DB (`Outlet.printNote/printBankQr`) |
| Ghi chú in + QR: ô chỉ đọc, QR khoá, gõ không đổi gì | - | ĐẠT | ĐẠT | ĐẠT | màn Máy in + DB |
| Hoá đơn in mang ghi chú + khối ngân hàng (#1308) | ĐẠT (chi nhánh 1 và 3 đúng ghi chú, QR theo chi nhánh) | ĐẠT | ĐẠT | ĐẠT | byte ESC/POS bắt ở `escpos-capture.py` |
| IP / cổng máy in tự cài | ĐẠT | ĐẠT | ĐẠT | ĐẠT | `anyrent.printer` prefs + job nhận được |
| Thông tin shop / chi nhánh (#1313) | ĐẠT: sửa shop + chi nhánh 3, chi nhánh tắt bị ẩn, chính đầu | ĐẠT: form 3 ô, sửa chi nhánh mình lưu vào DB | ĐẠT: chỉ xem, không Lưu/Hủy | ĐẠT: như nhân viên | `owner`, `shopinfo` |
| Cho trùng lịch: chủ shop bật/tắt bằng giao diện | ĐẠT | - | - | - | DB (công tắc không có node chữ, bấm theo toạ độ) |
| Cho trùng lịch: tắt thì giỏ khoá | - | ĐẠT | ĐẠT | ĐẠT | cảnh báo "Cửa hàng không cho tạo đơn trùng lịch" + nút Tạo đơn xám |
| Cache tài khoản ngân hàng (#1320) | - | - | ĐẠT | - | `bankcache`: A, đổi B không rời app vẫn A (cache), về nền rồi lên lại B |
| "Cài đặt cũ" (không `newSettings`) | ĐẠT: vào màn shop + chi nhánh mới | ĐẠT: form cũ, có Lưu, tiêu đề "Thông tin cửa hàng" | ĐẠT: form cũ chỉ đọc | - | `classic` |

Bảng chỉ ghi ca đã chạy xong; mỗi ca có dòng `PASS` / `FAIL` trong `$E2E_OUT/android/notes.txt`. Ảnh chụp: `$E2E_OUT/android/a1309-*.png`.

## Phát hiện và hành vi bất ngờ

- **#1319 vẫn mở** (như chủ shop đã ghi nhận): quản lý chi nhánh thấy dòng "Tài khoản ngân hàng" (`2 tài khoản`).
- **Số chi nhánh trên dòng Cài đặt đếm cả chi nhánh đã tắt**: chủ shop có 2 chi nhánh, tắt 1 thì dòng "Thông tin cửa hàng" vẫn ghi "2 chi nhánh" còn màn trong ghi "CHI NHÁNH · 1" (`SettingsRows.countPath` gọi `/api/outlets?limit=1&page=1`, `total` gồm cả chi nhánh tắt). Nhỏ, không chặn bản store.
- Dòng Cọc trên Android tên là "Cọc" (không phải "Thu cọc"); công tắc "Cho tạo đơn khi trùng lịch" không có node chữ cho tester (script bấm theo toạ độ).
- Màn Máy in của quản lý hiện một lần "Không tải được cài đặt hóa đơn của chi nhánh." ngay sau khi đăng nhập (đọc sau 3 giây), đọc lại ở lần sau thì có đủ; không tái hiện trong 3 lần chạy tiếp theo (quản lý, nhân viên, kho). Ghi nhận, chưa có bước tái hiện chắc chắn.
- "Cài đặt cũ": quản lý chi nhánh thấy dòng "Thông tin cửa hàng" (không phải "Thông tin chi nhánh") và form cũ 3 ô (tên, địa chỉ, số điện thoại) có nhãn "Tên cửa hàng"; đúng với ghi chú của epic (bản cũ giữ form cũ).

## Công cụ đã sửa trong lần chạy này

- `adb-ui.sh`: dump `uiautomator` từng treo hàng phút khi emulator chậm hoặc ô nhập có con trỏ nhấp nháy (SIGALRM không dừng được `adb`): thêm watchdog `kill -9` và xoá file dump cũ trước khi dump, để dump lỗi trả về rỗng thay vì màn hình cũ.
- `android-lib.sh`: `texts` bằng python (`cut | tr | cut` lỗi "Illegal byte sequence" với ký tự `¦`), `login_as` không bấm Back khi app chưa lên (thoát ra màn hình chính rồi gõ vào ô tìm kiếm Google).
- `settings-sync-api.js`: lệnh `bank list|create|default`, IP giả khác nhau mỗi lần đăng nhập để không dính giới hạn 10 lần / 15 phút.
- `escpos-capture.py`: máy in giả.
