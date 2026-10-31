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
| Dòng Cài đặt theo vai trò (`rows`) | ĐẠT | ĐẠT | ĐẠT | ĐẠT | văn bản màn hình |
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

- **#1319 đã làm:** quản lý chi nhánh thấy dòng "Tài khoản ngân hàng" (`2 tài khoản`), vào là màn chỉ xem (`bankview`).
- **Số chi nhánh trên dòng Cài đặt đếm cả chi nhánh đã tắt**: chủ shop có 2 chi nhánh, tắt 1 thì dòng "Thông tin cửa hàng" vẫn ghi "2 chi nhánh" còn màn trong ghi "CHI NHÁNH · 1" (`SettingsRows.countPath` gọi `/api/outlets?limit=1&page=1`, `total` gồm cả chi nhánh tắt). Nhỏ, không chặn bản store.
- Dòng Cọc trên Android tên là "Cọc" (không phải "Thu cọc"); công tắc "Cho tạo đơn khi trùng lịch" không có node chữ cho tester (script bấm theo toạ độ).
- Màn Máy in của quản lý hiện một lần "Không tải được cài đặt hóa đơn của chi nhánh." ngay sau khi đăng nhập (đọc sau 3 giây), đọc lại ở lần sau thì có đủ; không tái hiện trong 3 lần chạy tiếp theo (quản lý, nhân viên, kho). Ghi nhận, chưa có bước tái hiện chắc chắn.
- "Cài đặt cũ": quản lý chi nhánh thấy dòng "Thông tin cửa hàng" (không phải "Thông tin chi nhánh") và form cũ 3 ô (tên, địa chỉ, số điện thoại) có nhãn "Tên cửa hàng"; đúng với ghi chú của epic (bản cũ giữ form cũ).

## Công cụ đã sửa trong lần chạy này

- `adb-ui.sh`: dump `uiautomator` từng treo hàng phút khi emulator chậm hoặc ô nhập có con trỏ nhấp nháy (SIGALRM không dừng được `adb`): thêm watchdog `kill -9` và xoá file dump cũ trước khi dump, để dump lỗi trả về rỗng thay vì màn hình cũ.
- `android-lib.sh`: `texts` bằng python (`cut | tr | cut` lỗi "Illegal byte sequence" với ký tự `¦`), `login_as` không bấm Back khi app chưa lên (thoát ra màn hình chính rồi gõ vào ô tìm kiếm Google).
- `settings-sync-api.js`: lệnh `bank list|create|default`, IP giả khác nhau mỗi lần đăng nhập để không dính giới hạn 10 lần / 15 phút.
- `escpos-capture.py`: máy in giả.


---

# Lượt cuối trước bản store Android 0.1.11 (#1359, epic #1309)

Chạy ngày 2026-10-30 trên `origin/dev` `f85814d8e` (gồm #1307 … #1357). Emulator `e2e_final2_android` (Pixel 2, Android 14, cửa sổ hiện), tiếng Việt, API cục bộ cổng 3670 (`MOBILE_FEATURES` đủ, có `newSettings`; Node 20 để build) + DB riêng `anyrent_e2e_final2_android`, máy in giả `escpos-capture.py` cổng 9291. Chủ shop đổi cấu hình bằng API/SQL (giả lập máy khác); đơn cọc theo đợt và thu đợt 2 bằng `order-fixtures-api.js` với vai trò không đứng trên máy. Bốn vai trò: MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY (và shop một chi nhánh `healthy.owner@e2e-sub.test`).

```bash
scripts/mobile-e2e/prepare-accounts.sh create && scripts/mobile-e2e/prepare-accounts.sh staged
LANG_E2E=vi tests/e2e/mobile/android-flows.sh settings-sync <listing|othbr|sharenote|share> <merchant|manager|kho|staff|onebranch>
```
Mỗi ca nên chạy sau khi khởi động lại API (giới hạn 10 lần đăng nhập / 15 phút): không khởi động lại API NGAY KHI ca vừa bắt đầu, vì lệnh API đầu tiên của ca (`settings-sync-api.js`) sẽ rơi vào lúc API chưa lên. Đơn cọc theo đợt cần `Merchant.settings.payment.depositMode = STAGED` (seed không bật) và tiền tệ VND (seed là USD); ca `share` tự đặt VND.

## Kết quả (ca mới)

| Ca | Chủ shop | Quản lý CN | Nhân viên | Kho | Shop 1 chi nhánh | Cách kiểm |
|---|---|---|---|---|---|---|
| `listing`: Home | ĐẠT: món bỏ tick vẫn hiện, nhãn "Chưa hiện ở chi nhánh này", không nút + | ĐẠT: món bỏ tick không hiện | ĐẠT: như quản lý | ĐẠT: như quản lý | - | văn bản màn hình |
| `listing`: món tick tồn 0 | ĐẠT: "Hết hôm nay" | ĐẠT | (chưa kiểm riêng) | ĐẠT | - | văn bản màn hình |
| `listing`: form / chi tiết | ĐẠT: tick và bỏ tick lưu vào DB, bỏ tick không bị chặn, có dòng nhắc | ĐẠT: ô tick mờ "Chỉ chủ shop bật/tắt", bấm không đổi | ĐẠT: dòng mờ ở chi tiết, không nút Sửa | ĐẠT: như quản lý | ĐẠT: không ô tick | ảnh chụp + DB |
| `listing`: đơn đang mở của món bỏ tick | ĐẠT | ĐẠT | ĐẠT | ĐẠT | - | Đơn hàng, tìm theo số |
| `othbr`: gợi ý 1 ngày và nhiều ngày | ĐẠT | ĐẠT | ĐẠT (không dòng gợi ý) | ĐẠT | ĐẠT (không gợi ý) | văn bản giỏ |
| `othbr`: nhân viên không gọi API | - | - | ĐẠT: dòng `POST other-outlets-availability` trong log API 0 → 0 (đối chứng: curl của quản lý 0 → 1) | - | - | log API |
| `sharenote`: công tắc | ĐẠT: bật rồi tắt, lưu ngay (DB) | ĐẠT: mờ "Chỉ chủ shop bật/tắt.", bấm không đổi | ĐẠT | ĐẠT | - | DB |
| `share`: "Thu khi giao" ở chi tiết, đợt 2 chưa thu | ĐẠT 575.000 | ĐẠT 575.000 | ĐẠT 575.000 | ĐẠT 575.000 | - | văn bản màn hình |
| `share`: sau khi thu đợt 2 | ĐẠT: dòng 575.000, nút "Giao đồ · thu 575.000" | ĐẠT | ĐẠT | ĐẠT | - | văn bản màn hình |
| `share`: ảnh chia sẻ (thứ tự tiền, đợt Đã thu / Chưa thu, ghi chú theo công tắc đổi từ máy khác) | ĐẠT | ĐẠT | ĐẠT | ĐẠT | - | JPG thật trong `shots/` |

Nút "Giao đồ · thu 920.000" khi còn đợt chưa thu: đúng như ghi nhận (chờ chủ shop quyết), không tính là lỗi mới.

## Kết quả (ca cũ chạy lại)

`rows` (4 vai trò), `deposit`, `shopinfo` (quản lý, nhân viên, kho), `owner`, `owner-bills`, `print` (quản lý, nhân viên, kho; byte ESC/POS), `bankcache`, `currency-fg` (nhân viên, quản lý, kho), `overlap` (nhân viên, quản lý), `classic` (chủ shop, quản lý, nhân viên): tất cả ĐẠT. Ghi nhận như cũ: #1319 (quản lý vẫn thấy "Tài khoản ngân hàng"), số chi nhánh ở dòng Cài đặt đếm cả chi nhánh tắt (#1331).

## Lưu ý cho người chạy lại

- Ô tick của Compose không có node trong uiautomator (cả khi mờ): `tick_state` đọc điểm ảnh trong ô (đầy = đã tick, trắng = chưa) từ ảnh chụp màn hình.
- Bàn phím gợi ý của emulator làm hỏng chuỗi dài gõ bằng `adb input text` ("E2E Tick Hien" thành "E2E Tick Hien to ft ft"): gõ chuỗi ngắn.
- Ảnh chia sẻ không đọc bằng văn bản: ca `share` lấy JPG app vừa ghi (`run-as anyrent.shop cat cache/receipts/<đơn>.jpg`) về `shots/` để xem.
- Đơn cọc theo đợt do nhân viên tạo bằng API chỉ có một đợt 30% (kế hoạch mặc định); ca `share` luôn tạo đơn bằng chủ shop hoặc quản lý.
