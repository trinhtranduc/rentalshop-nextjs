# Spec (#1319)

Status: in-progress.

## API
`POST`, `PUT`, `DELETE /api/merchants/{m}/outlets/{o}/bank-accounts[/{id}]`:

| Vai trò | Ghi | Đọc |
|---|---|---|
| MERCHANT, ADMIN, OPS | như cũ | như cũ |
| OUTLET_ADMIN | 403 `INSUFFICIENT_PERMISSIONS`, kể cả chi nhánh của mình | như cũ |
| OUTLET_STAFF, OUTLET_INVENTORY | 403 `FORBIDDEN` như cũ | như cũ |

`ROLE_PERMISSIONS.OUTLET_ADMIN` bỏ `bankAccounts.manage`, giữ `bankAccounts.view`. Không đổi route, shape hay mã lỗi đang có.

## App (iOS là chuẩn, Android giống iOS)
- Dòng "Tài khoản ngân hàng" trong Cài đặt: chủ shop và quản lý chi nhánh vẫn thấy, kèm số tài khoản. Nhân viên, kho không thấy (như cũ).
- Quản lý chi nhánh vào màn: không nút +, không chevron, bấm dòng không mở form, không vuốt xoá. Danh sách trống: câu "Chỉ chủ shop thêm được", không nói "Bấm +".
- Logic: `canViewBankAccounts` (merchant, outletAdmin) cho dòng và số tài khoản, `canManageBankAccounts` (merchant) cho thao tác.

## Web (apps/client)
- `/outlets/{id}/bank-accounts` và Cài đặt > Thu tiền đọc `bankAccounts.manage`: quản lý chi nhánh chỉ xem.
- Danh sách trống không còn câu mời thêm với người chỉ xem.
- Cài đặt > In & phiếu: nút "Thêm tài khoản ngân hàng" chỉ cho chủ shop; quản lý chi nhánh vẫn đọc được câu "Chi nhánh chưa có tài khoản".
- `apps/admin` không đổi.

## Ngoài phạm vi
Quyền ghi chú in và công tắc QR (`Outlet.printNote`, `printBankQr`) giữ nguyên.
