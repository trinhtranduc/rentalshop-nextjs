# Spec (#1279)

## Hành vi
Đơn thuê (RENT) trạng thái PICKUPED, người dùng có `orders.update`:
- Chi tiết đơn có thẻ "Giấy tờ & thế chân" + nút "Sửa" + dòng "<giấy tờ> · <thế chân>" (chưa có thì "Chưa nhập").
- "Sửa" mở sheet: ô "Giấy tờ để lại", ô "Cọc thế chân", cảnh báo "Đổi thế chân sẽ đổi số trả lại khi nhận trả", nút "Lưu".
- Lưu: `PUT /api/orders/{id}` body `{collateralType, collateralDetails, securityDeposit}`. Trạng thái giữ PICKUPED.
- Số "Cuối kỳ: trả lại / thu thêm" và sheet Nhận trả tính lại từ thế chân mới.

## Bảng hiện nút Sửa
| Loại | Trạng thái | Quyền `orders.update` | Nút Sửa |
|---|---|---|---|
| RENT | PICKUPED | có | hiện |
| RENT | PICKUPED | không | ẩn |
| RENT | RESERVED / RETURNED / CANCELLED | bất kỳ | ẩn (RESERVED: đã có Sửa đơn và ô trong sheet Giao đồ) |
| SALE | bất kỳ | bất kỳ | ẩn |

## Quyền theo vai trò (đã kiểm API `apps/api/app/api/orders/[orderId]/route.ts` PUT, `packages/auth/src/permissions.ts`)
PUT dùng `withPermissions(['orders.update'])`. Không có kiểm vai trò hay trạng thái riêng cho `securityDeposit` / `collateral*`.
| Vai trò | orders.update | Sửa khi PICKUPED |
|---|---|---|
| ADMIN, MERCHANT, OUTLET_ADMIN | có | được (outlet role chỉ đơn của outlet mình, 403 nếu khác) |
| OUTLET_STAFF, OUTLET_INVENTORY | có | được (cùng ràng buộc outlet) |
| OPS, ARTICLE | xem permissions.ts | theo `orders.update` |
UI ẩn nút khi thiếu `orders.update`; API vẫn là chốt.

## Tiền
Giữ quy tắc `order-balance.ts`: ở PICKUPED, trả lại = thế chân + đã thu RETURN_ADJUSTMENT - phí trễ - phí hỏng. Sửa thế chân đổi đúng số này.

## Kiểm toán
API đã ghi `logUpdate` (`securityDeposit`, `collateralType`, `collateralDetails` trong `change-timeline.ts`). Không đổi.

## Web
Đã có: `apps/client/app/orders/[id]/page.tsx:365-367` mở ô thế chân / giấy tờ khi PICKUPED, `SettingsSummary` có nút sửa. Giữ nguyên.

## API compatibility
Không đổi API, không dòng mới trong LOG.md.
