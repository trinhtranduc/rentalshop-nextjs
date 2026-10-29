# Cấu hình đồng bộ trên app mobile: kịch bản (#1315, epic #1309)

Trạng thái (2026-10-29): **iOS đã chạy một phần trên Simulator, Android đã viết nhưng chưa chạy** (dừng vì ổ đĩa còn dưới 6 GB).
iOS (`AnyRentE2ETests`, iPhone 17 Pro Max, tiếng Việt, API cục bộ + DB riêng), đạt: `test7qSettingsSyncCurrency` (nhân viên, quản lý), `test7rSettingsSyncPrintNote` (nhân viên, quản lý), `test7tSettingsSyncOverlapCart` (nhân viên).
Chưa chạy: `test7tSettingsSyncOverlapCart` bằng quản lý (bị dừng giữa chừng), nhánh chủ shop của `test7rSettingsSyncPrintNote` (`ownerEditsPrintSettings`), `test7sSettingsSyncDepositHidden` (cần build của PR #1316 và `E2E_PR1310=1`), toàn bộ Android.
Biến cho lần chạy iOS: `E2E_OUTLET_ID` (id chi nhánh của tài khoản thử), `E2E_OWNER_EMAIL/PASSWORD` (mặc định chủ merchant1), `E2E_PR1310`; `ios-e2e.sh` chuyển chúng và `E2E_API_URL` vào test.
Cũ:  Phía API đã có test chạy được: `tests/e2e/business/settings-sync.e2e.test.js` (mục SS trong `tests/e2e/TEST_CASES.md`).
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
| (a) tiền tệ | đổi VND ↔ USD | nhân viên mở lại app, Tổng quan đổi đơn vị (đ ↔ $); đổi lại thì về như cũ | #1307 (đã merge qua #1312) | `android-flows.sh settings-sync currency` | `test7qSettingsSyncCurrency` (đã chạy: nhân viên, quản lý) |
| (b) ghi chú in + QR | sửa ghi chú, bật QR ở Máy in | nhân viên và quản lý thấy cùng ghi chú, ô chỉ đọc có dòng "Chỉ chủ shop mới đổi được..."; hoá đơn in/chia sẻ của nhân viên mang ghi chú đó | #1308 (đã merge qua #1311) | `android-flows.sh settings-sync print` (phần hoá đơn là MANUAL: xem ảnh) | `test7rSettingsSyncPrintNote` (đã chạy: nhân viên, quản lý; chủ shop chưa chạy) |
| (c) Thu cọc ẩn | không làm gì | quản lý và nhân viên không có dòng "Thu cọc"; chủ shop có | **#1310 chưa làm: SKIP** (`E2E_PR1310_MERGED=1` để bật) | `android-flows.sh settings-sync deposit` | `test7sSettingsSyncDepositHidden` (SKIP cho đến khi #1310 merge) |
| (d) cho trùng lịch | tắt rồi bật "Cho tạo đơn khi trùng lịch" | nhân viên: giỏ chặn món đã hết ngày khi tắt, cho qua khi bật | không | `android-flows.sh settings-sync overlap` | `test7tSettingsSyncOverlapCart` (đã chạy: nhân viên) |

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

## iOS: cách hoạt động

Test Swift nằm trong `AnyRentE2ETests.swift` (mục `#1315 settings sync`). UI test chạy trong Simulator nên gọi API cục bộ bằng `URLSession` với tư cách chủ shop (`OwnerAPI`), còn máy thử đăng nhập bằng giao diện là nhân viên hoặc quản lý. Chủ shop không được vừa đăng nhập app vừa gọi API (một phiên), nên `test7q`/`test7t` bỏ qua tài khoản chủ shop.
Ví dụ: `E2E_OUTLET_ID=1 scripts/mobile-e2e/ios-e2e.sh --email admin.outlet1@example.com --password admin123 --role staff --label manager --only test7rSettingsSyncPrintNote --lang vi`.
