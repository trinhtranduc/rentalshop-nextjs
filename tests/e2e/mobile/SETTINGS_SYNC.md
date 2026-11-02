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

## iOS: bốn vai trò, lần chạy gộp trên `dev` (#1327, 2026-10-29)

Chạy trên Simulator có cửa sổ (iPhone 17 Pro Max, tiếng Việt), API cục bộ + DB riêng, `E2E_PR1310=1`, `E2E_OUTLET_ID=1`.
Biến thêm cho ca chủ shop: `TEST_RUNNER_E2E_OWNER_SET` (ví dụ `currency=VND,overlap=off`, cho `test7u`), `TEST_RUNNER_E2E_BRANCH_NAME` (cho `test7w`, mặc định `Outlet 2`), `TEST_RUNNER_E2E_PRINTER_IP=127.0.0.1` (cho `test7nPrinting`, bật `scripts/virtual-printer`).
Quản lý chi nhánh chạy bằng `--account manager` (OUTLET_ADMIN, `admin.outlet1@example.com`, `E2E_ROLE=manager`).

| Ca | Test | Chủ shop | Quản lý | Nhân viên | Kho |
|---|---|---|---|---|---|
| Tiền tệ: chủ shop đổi bằng giao diện | `test7uOwnerChangesSettingsByUI` (`TEST_RUNNER_E2E_OWNER_SET=currency=VND`) | ĐẠT (DB đổi) | | | |
| Tiền tệ: máy khác thấy sau khi mở lại app | `test7qSettingsSyncCurrency` | bỏ qua (phiên) | ĐẠT | ĐẠT | ĐẠT |
| Ghi chú in + QR: chủ shop sửa (chi nhánh 1 và chi nhánh khác) | `test7rSettingsSyncPrintNote`, `test7wOwnerPrintOtherBranch` | ĐẠT | | | |
| Ghi chú in + QR: ô chỉ đọc | `test7rSettingsSyncPrintNote` | | ĐẠT | ĐẠT | ĐẠT |
| Dòng Cọc chỉ chủ shop (#1310) | `test7sSettingsSyncDepositHidden` | ĐẠT (thấy) | ĐẠT (ẩn) | ĐẠT (ẩn) | ĐẠT (ẩn) |
| Giỏ vẫn thu cọc theo cấu hình shop | `test7vSettingsSyncDepositCart` | bỏ qua (phiên) | ĐẠT | ĐẠT | ĐẠT |
| Cho trùng lịch: chủ shop đổi bằng giao diện | `test7uOwnerChangesSettingsByUI` (`overlap=off`), `test7eOverlapSetting` | ĐẠT | | | |
| Cho trùng lịch: Giỏ khoá/mở | `test7tSettingsSyncOverlapCart` | bỏ qua (phiên) | ĐẠT | ĐẠT | ĐẠT |
| Thông tin cửa hàng / chi nhánh (#1313) | `test7sShopAndBranchInfo`, `test7zCompactSettings` | ĐẠT | ĐẠT | ĐẠT | ĐẠT |
| Tài khoản ngân hàng: dòng hiện (#1319: quản lý chỉ xem) | `test7kBankAccounts` | ĐẠT (sửa được) | ĐẠT (chỉ xem) | ẩn | ẩn |
| IP máy in theo máy | `test7oPrinterIPKeyboard` | | ĐẠT | ĐẠT | ĐẠT |

Dữ liệu hoá đơn của máy không phải chủ shop (không đọc chữ trong ảnh): `SettingsSyncBillTests` (unit test chạy trong app, đăng nhập bằng `AuthenticationService`, tải đơn bằng `OrderService`, kiểm byte in `Order.toPrintData` và `OrderShareModel`):

```bash
scripts/mobile-e2e/ios-e2e.sh --help   # dựng API + DB như trên, rồi:
cd apps/mobile && TEST_RUNNER_E2E_API_URL=http://localhost:$E2E_API_PORT TEST_RUNNER_E2E_BILL_EMAIL=staff.outlet1@example.com \
  TEST_RUNNER_E2E_BILL_PASSWORD=staff123 TEST_RUNNER_E2E_OUTLET_ID=1 xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development \
  -destination "platform=iOS Simulator,name=<simulator>" -only-testing:"POS ADBDTests/SettingsSyncBillTests" API_BASE_URL=http://localhost:$E2E_API_PORT test
# thêm TEST_RUNNER_E2E_BILL_WAIT=1 để chạy ca chờ 5 phút (#1320)
```
Đạt với nhân viên, quản lý, kho: ghi chú in và số tài khoản mặc định có trong byte in; tắt QR thì không có số tài khoản; chủ shop đổi mặc định ở máy khác thì máy này in tài khoản cũ trong 5 phút, in tài khoản mới sau foreground và sau 5 phút.
`test7nPrinting` với máy in ảo (`scripts/virtual-printer`, `TEST_RUNNER_E2E_PRINTER_IP=127.0.0.1`) cho thấy tờ in thật.
