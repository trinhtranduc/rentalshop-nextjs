# Spec — Mobile order detail

Issue: #372 · Status: accepted · Intent: ./intent.md

## Behavior

1. Flag `newOrderDetail` off → old detail screens, unchanged (except 12 and 13). On → the new detail opens from
   every order entry point (iOS through one router; Android on the `order/{id}` destination).
2. Rental detail: top bar `#ORD-…`, print, ⋯. Header: customer, status pill (Đã đặt / Đang thuê / Đã trả /
   Đã hủy), call button, progress Đã đặt → Giao → Trả with dates (hidden when cancelled).
   Rows: Lịch thuê `dd/MM → dd/MM · N ngày`, Thế chấp. Items with image, `× qty`, unit price, line total.
3. Late: RESERVED past pickup day or PICKUPED past return day (device-zone days, phase 1 helper) shows a red
   note "Trễ hạn trả N ngày" / "Trễ giao N ngày" with the plan date. Status stays the real status.
4. Money block, rental: Tổng (with discount), Đã cọc khi đặt, Thế chấp tiền; then by status
   RESERVED "Thu khi giao" = amountDue; PICKUPED fees and "Khi nhận trả: trả khách / thu thêm".
5. One primary action: RESERVED → "Giao đồ · thu X" (or "Giao đồ" when X = 0); PICKUPED → "Nhận trả".
   Secondary "Sửa đơn" next to it when editing is allowed. Other statuses → "In hóa đơn".
6. ⋯ menu: Sửa (RENT RESERVED or SALE COMPLETED, `canManageOrders`), Ghi chú, In hóa đơn,
   Hủy đơn (RENT RESERVED/PICKUPED, SALE RESERVED/COMPLETED, `canManageOrders`, confirm),
   Xóa đơn (CANCELLED, as today).
7. Sale detail: tag Hoàn thành / Đã hủy, sale day, items with sale price, Tiền hàng, Giảm, "Đã thu";
   bottom Hủy đơn (when allowed) + In hóa đơn.
8. Hand-over sheet: customer · code · dates, items, Tổng đơn, Đã cọc, Thế chấp tiền, Đã thu trước, "Thu bây giờ",
   collateral papers; confirm "Đã giao · thu X" → `PUT {status: PICKUPED}`.
   Android keeps its payment-method choice and records the payment first, as today.
9. Return sheet: items, Phí trễ and Phí hư hỏng inputs (prefilled), Thế chấp đang giữ, result
   "Trả lại khách X" or "Thu thêm X"; confirm saves changed fees (`lateFee`, `damageFee`) then `PUT {status: RETURNED}`.
10. Money rule = `computeOrderBalance`: pickup = total − deposit + collateral money − completed PICKUP payments;
    return = late + damage − collateral money − completed RETURN_ADJUSTMENT payments (negative = refund).
11. A 4xx on a status change (e.g. `INVALID_ORDER_STATUS`) shows the translated message and reloads the order.
12. Android old screen: status-change failures are shown (they were dropped).
13. Notes: text + up to 5 photos; removing keeps the remaining URLs (JSON `notesImages`), new photos go as
    multipart `notesImages` in a second request (`docs/API_ORDER_NOTES_IMAGES.md`). Android old screen can
    remove an existing photo and sends the kept URLs.
14. Edit order: Sửa loads the order into the cart exactly as the current apps do (iOS `Cart.fromOrder`,
    Android `CartStore.loadFromOrderDetail`).

## Out of scope

New cart/edit layout (phase 3), payment recording on iOS, late-fee rules, API changes, item checklists.

## API and data

Reads `GET /api/orders/:id` (items, payments, fees, notesImages). Writes `PUT /api/orders/:id` with existing
fields only. Numeric ids only.

## Acceptance

- [ ] Unit tests both apps: actions per type/status, hand-over and return money, notes payload (kept + new, max 5),
      `INVALID_ORDER_STATUS` handling
- [ ] Flag on/off checked on both apps against a local API
- [ ] New strings in vi and en on both apps
