# Spec (#1327)

1. `scripts/mobile-e2e/ios-e2e.sh --account manager`: đăng nhập `admin.outlet1@example.com` (OUTLET_ADMIN), `E2E_ROLE=manager`.
2. `test7zCompactSettings` và `test7kBankAccounts` biết vai trò `manager`: dòng Tài khoản ngân hàng hiện với chủ shop và quản lý chi nhánh (đến khi #1319 làm); dòng Cọc chỉ chủ shop (#1310).
3. `test7uOwnerChangesSettingsByUI` (chủ shop, đọc `TEST_RUNNER_E2E_OWNER_SET`, ví dụ `currency=VND,overlap=off`): đổi Tiền tệ và Cho trùng lịch bằng giao diện, không gọi API với tư cách chủ shop; DB được đọc trước và sau.
4. `SettingsSyncBillTests` (unit test chạy trong app, cần `TEST_RUNNER_E2E_API_URL` + tài khoản máy thử, nếu không thì bỏ qua):
   - đăng nhập bằng `AuthenticationService`, tải đơn bằng `OrderService`, dựng byte in (`Order.toPrintData`) và mô hình ảnh chia sẻ (`OrderShareModel`);
   - ghi chú in của chi nhánh và công tắc QR đến từ `order.outlet`; byte in có ghi chú; có số tài khoản mặc định khi QR bật, không có khi tắt;
   - chủ shop đổi tài khoản mặc định ở máy khác: trong 5 phút máy này còn in tài khoản cũ; sau `applicationWillEnterForeground` in tài khoản mới; sau 5 phút (`TEST_RUNNER_E2E_BILL_WAIT=1`) cũng in tài khoản mới.
