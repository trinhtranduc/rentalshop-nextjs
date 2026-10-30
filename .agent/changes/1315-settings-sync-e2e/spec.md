# Spec (#1315)

Status: in-progress.

## API (đã chạy): `tests/e2e/business/settings-sync.e2e.test.js`
Tài khoản: MERCHANT, OUTLET_ADMIN + OUTLET_STAFF + OUTLET_INVENTORY của chi nhánh A, OUTLET_ADMIN + OUTLET_STAFF của chi nhánh B (cùng merchant).

| ID | Kịch bản |
|---|---|
| SS-CUR-01 | Chủ shop đổi tiền tệ; mọi vai trò ở cả hai chi nhánh đọc `GET /api/settings/currency` thấy giá trị mới; đổi lại, đọc lại |
| SS-CUR-02 | Quản lý, nhân viên, kho PUT tiền tệ: 403 `INSUFFICIENT_PERMISSIONS`, giá trị không đổi |
| SS-DEP-01 / 02 | Như trên cho `/api/settings/deposit` (chế độ và chính sách huỷ) |
| SS-OVL-01 / 02 | Như trên cho `allowOverlappingOrders` (PUT `/api/settings/merchant`, đọc `/api/users/profile`) |
| SS-PRN-01 | Chủ shop sửa ghi chú in + QR của chi nhánh A; quản lý, nhân viên, kho đọc qua `/api/outlets` và `order.outlet` của `GET /api/orders/:id` |
| SS-PRN-02 | Cấu hình in theo từng chi nhánh; quản lý chi nhánh A sửa chi nhánh B bị 403 |
| SS-PRN-03 | Nhân viên, kho PUT in: 403, không đổi |
| SS-PRN-04 | [hiện tại] quản lý chi nhánh vẫn sửa được ghi chú in qua API (quy tắc mới #1308: chỉ chủ shop, API chưa đổi) |
| SS-BNK-01..03 | Tài khoản ngân hàng: chủ shop thêm, mọi vai trò của chi nhánh đọc; nhân viên/kho thêm 403; [hiện tại] quản lý chi nhánh thêm được (quy tắc mới: chỉ chủ shop, cần issue riêng) |

## Mobile (chỉ viết): `tests/e2e/mobile/android-flow-settings-sync.sh`, `tests/e2e/mobile/SETTINGS_SYNC.md`
Xem SETTINGS_SYNC.md: (a) tiền tệ #1307, (b) ghi chú in + QR #1308, (c) Thu cọc ẩn #1310 (skip), (d) cho trùng lịch.
