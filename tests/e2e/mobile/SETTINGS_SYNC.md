# Cấu hình đồng bộ trên app mobile: kịch bản (#1315, epic #1309)

Trạng thái: **đã viết, chưa chạy.** Phía API đã có test chạy được: `tests/e2e/business/settings-sync.e2e.test.js` (mục SS trong `tests/e2e/TEST_CASES.md`).
Mọi lần chạy giao diện phải HIỆN cửa sổ: Simulator ở phía trước (`open -a Simulator`), AVD có cửa sổ (không `-no-window`).

Cách chia việc: phía chủ shop đổi cấu hình qua API (`tests/e2e/mobile/settings-sync-api.js`, đăng nhập chủ shop, chủ shop không được đăng nhập trên máy khác lúc đó vì phiên là một); máy thử là tài khoản nhân viên hoặc quản lý, phải thấy giá trị mới sau khi mở lại app. Đường sửa bằng giao diện của chủ shop ghi thành bước TODO trong script (selector chưa kiểm trên máy).

## Chuẩn bị (một lần)

```bash
export E2E_DATABASE_URL=postgresql://<you>@127.0.0.1:5432/anyrent_settings_sync   # DB riêng của bạn
export E2E_API_PORT=3196 E2E_OUT=<scratch>/e2e E2E_SIMULATOR="iPhone 17 Pro Max" E2E_AVD=anyrent_e2e E2E_AVD_PORT=5570
scripts/mobile-e2e/seed-local.sh && scripts/mobile-e2e/api-local.sh start --build
scripts/mobile-e2e/prepare-accounts.sh staged          # sản phẩm "Váy trùng đơn test" cho ca (d)
```
Tài khoản: chủ `merchant1@example.com`, nhân viên `staff.outlet1@example.com`, quản lý `admin.outlet1@example.com` (cùng merchant 1; email đánh số theo id, đọc từ DB trước).

## Ma trận

| Ca | Chủ shop làm | Máy thử phải thấy | Chờ | Android | iOS |
|---|---|---|---|---|---|
| (a) tiền tệ | đổi VND ↔ USD | nhân viên mở lại app, Tổng quan đổi đơn vị (đ ↔ $); đổi lại thì về như cũ | #1307 (đã merge qua #1312) | `android-flows.sh settings-sync currency` | `test7qSettingsSyncCurrency` (chưa viết Swift, xem dưới) |
| (b) ghi chú in + QR | sửa ghi chú, bật QR ở Máy in | nhân viên và quản lý thấy cùng ghi chú, ô chỉ đọc có dòng "Chỉ chủ shop mới đổi được..."; hoá đơn in/chia sẻ của nhân viên mang ghi chú đó | #1308 (đã merge qua #1311) | `android-flows.sh settings-sync print` (phần hoá đơn là MANUAL: xem ảnh) | `test7rSettingsSyncPrintNote` |
| (c) Thu cọc ẩn | không làm gì | quản lý và nhân viên không có dòng "Thu cọc"; chủ shop có | **#1310 chưa làm: SKIP** (`E2E_PR1310_MERGED=1` để bật) | `android-flows.sh settings-sync deposit` | `test7sSettingsSyncDepositHidden` (SKIP) |
| (d) cho trùng lịch | tắt rồi bật "Cho tạo đơn khi trùng lịch" | nhân viên: giỏ chặn món đã hết ngày khi tắt, cho qua khi bật | không | `android-flows.sh settings-sync overlap` | `test7tSettingsSyncOverlapCart` |

## Lệnh chạy sau này (cửa sổ phải hiện)

```bash
# Android: AVD có cửa sổ
scripts/mobile-e2e/android-e2e.sh --fresh                       # cài app lên AVD
LANG_E2E=vi tests/e2e/mobile/android-flows.sh settings-sync currency
LANG_E2E=vi tests/e2e/mobile/android-flows.sh settings-sync print
LANG_E2E=vi tests/e2e/mobile/android-flows.sh settings-sync overlap
tests/e2e/mobile/android-flows.sh settings-sync deposit         # SKIP cho đến khi #1310 merge
# iOS: Simulator ở phía trước
open -a Simulator
scripts/mobile-e2e/ios-e2e.sh --fresh --account staff --only test7qSettingsSyncCurrency
```
Mỗi lần chạy: đổi cấu hình bằng API trước, kiểm trên máy thử, rồi trả về giá trị ban đầu (script tự đổi lại). Đọc ảnh chụp, đừng chỉ nhìn kết quả xanh.

## iOS: chưa viết Swift

`AnyRentE2ETests.swift` đã hơn 5000 dòng và không thể biên dịch ở lượt này (không build app). Phần Swift cần thêm, theo mẫu `test7eOverlapSetting` và `test8StaffRestrictions`:
1. Tên phương thức ở bảng trên; mỗi phương thức gọi `settings-sync-api.js` qua biến `E2E_SYNC_CMD` (đặt bằng `TEST_RUNNER_E2E_SYNC_CMD`) hoặc, đơn giản hơn, script bao ngoài đổi cấu hình rồi chạy `--only` từng bước (trước / sau).
2. (a) đọc nhãn tiền ở Tổng quan (`đ` hay `$`) trước và sau khi `terminate` + `launch` app.
3. (b) mở Cài đặt > Máy in, kiểm ô ghi chú có đúng chuỗi và bị khoá (`isEnabled == false`), thấy chuỗi `printer.outlet.readonly`.
4. (c) `staticTexts["Thu cọc"].exists == false` cho staff và quản lý, `true` cho chủ shop; `XCTSkip("waits for #1310")` cho tới khi #1310 merge.
5. (d) giỏ với "Váy trùng đơn test": thông báo `Cửa hàng không cho tạo đơn trùng lịch` khi tắt, không có khi bật.
