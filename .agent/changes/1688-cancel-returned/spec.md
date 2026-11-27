# Spec #1688

## Quy tắc
Đơn **thuê** `RETURNED` chuyển được sang `CANCELLED`, qua `PATCH /api/orders/[orderId]/status` và `PUT /api/orders/[orderId]`. Mọi thay đổi khác của `RETURNED` vẫn bị `400 INVALID_ORDER_STATUS`. Đơn bán không đổi.

## Ví dụ (thuê 300.000đ, cọc thế chân 500.000đ đã trả lại, trả hàng 20/11, huỷ 27/11)

| Người huỷ | Đơn | Kết quả |
|---|---|---|
| MERCHANT | không có kế hoạch cọc | `CANCELLED`, `cancelledAt` = 27/11; **không** tạo dòng hoàn tiền; không còn tính vào doanh thu (báo cáo các ngày cũ, kể cả 20/11, thay đổi, như mọi đơn huỷ) |
| MERCHANT | có kế hoạch cọc, đã thu 3.600.000đ | `CANCELLED`; ghi dòng hoàn `REFUNDED` 3.600.000đ như huỷ hiện nay (`planCancellation`) |
| OUTLET_ADMIN, đơn của chi nhánh mình | bất kỳ | như MERCHANT |
| OUTLET_ADMIN, đơn chi nhánh khác | | `403 CANNOT_UPDATE_ORDER_FROM_OTHER_OUTLET` (có sẵn) |
| OUTLET_STAFF / OUTLET_INVENTORY | bất kỳ | `403 INSUFFICIENT_PERMISSIONS`, không ghi gì |
| ai cũng | `RETURNED → RESERVED` hoặc `PICKUPED` | `400 INVALID_ORDER_STATUS` (không đổi) |

Sau khi huỷ: MERCHANT / OUTLET_ADMIN xoá được (`DELETE`, quy tắc #1199: đơn huỷ giữ tiền không xoá được). Điểm tích lũy: `handleLoyaltyOnCancel` hoàn điểm dùng và trừ điểm đã nhận. Không có điều chỉnh tồn kho khi đổi trạng thái.

## Web
`canCancelOrder` (`apps/client/app/orders/detail/actions-model.ts`) cho `RENT` + `RETURNED` khi `canManageOrders` (nhân viên không có quyền này nên nút không hiện).

## Mobile
Issue riêng: iOS `OrderDetailLogic.actions`, Android `OrderDetailLogic.kt` / `OrderDetailActions.kt`: nút Huỷ cho `RENT` + `RETURNED` khi `canManageOrders`.

## Không làm
Ghi dòng hoàn tiền mới cho đơn thường, đổi báo cáo doanh thu, cho nhân viên huỷ, `COMPLETED → RETURNED`, màn hình cũ `packages/ui` OrderDetail (đã ẩn Huỷ cả ở `PICKUPED`, không đổi trong issue này).
