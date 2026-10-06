# Spec — #560

## Giao đồ (RENT, RESERVED)
Title "Giao đồ cho khách". Subtitle: customer · #number · `T5 08/10 → T6 16/10`.
Items: name × qty. Money box (iOS `renderMoney` `.handOver`, `HandOverMoney`):

| Row | Shown when | iOS key |
|---|---|---|
| Tổng đơn hàng | always | Order total |
| Đã cọc khi đặt | deposit > 0 | Deposit paid at booking |
| Thế chân thu thêm | securityDeposit > 0 | Collateral money |
| Đã thu trước | completed `PICKUP` payments > 0 | Already collected |
| **Thu bây giờ** | always: `max(0, total − deposit + thế chân − đã thu trước)` | Collect now |

Then "Giấy tờ để lại: CCCD · Driver License" when set. Buttons: Đóng, "Giao đồ · thu X"
(or "Xác nhận giao đồ" when 0). Confirm calls `ordersApi.pickupOrder(id)` as today.

## Nhận trả (RENT, PICKUPED)
Title "Nhận trả đồ". Subtitle: customer · #number · `trả trễ N ngày` when late, else the range.
Fields: Phí trễ (read-only, `order.lateFee`, "(N ngày)" when late), Phí hư hỏng (input, as today).
Money box (iOS `.takeReturn`, `ReturnMoney`):

| Row | Shown when | iOS key |
|---|---|---|
| Phí trễ + hư hỏng | always | Late + damage fees |
| Thế chân đang giữ | securityDeposit > 0 | Collateral money held |
| Đã thanh toán trước | completed `RETURN_ADJUSTMENT` payments > 0 | Already settled |
| **Trả lại khách / Thu thêm / Không phát sinh** | `net = fees − thế chân − đã thanh toán trước` | Give back / Collect more / Nothing to settle |

Then "Trả lại giấy tờ: …". Buttons: Đóng, "Nhận trả · thu X" / "Nhận trả · trả khách X" / "Xác nhận nhận trả". Confirm: as today — `updateOrderSettings({damageFee})` only when the fee
changed, then `returnOrder(id)`.

## Huỷ đơn / Xoá đơn
Same themed dialog, danger confirm. Cancel calls `cancelOrder(id)`; delete calls `deleteOrder(id)`
then goes to `/orders`. Who sees them is unchanged.

## Not changed
Request bodies, permissions, the Thanh toán card, the receipt (shared, `packages/**`).
