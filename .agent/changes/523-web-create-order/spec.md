# Spec — #523 Shop web Tạo đơn (+ Sửa đơn)

Issue: #523 · Status: accepted · Intent: ./intent.md

## Screen `/orders/create`

1. **Layout**: products on the left, cart (aside, 380px) on the right; under 1100px the cart follows the products.
2. **Header**: h1 "Tạo đơn" (edit: "Sửa đơn #n"); the rental days button "Giao T4 07/10 → Trả T6 09/10 · 3 ngày" (rent only). Days count both ends (`countRentalDays`).
3. **Days first**: a new rent order opens the days dialog before anything else. The dialog has quick picks (Hôm nay, Ngày mai, Cuối tuần, 3 ngày) and pickup / return day fields; return before pickup is refused; max `BUSINESS.MAX_RENTAL_DAYS`.
4. **Products**: search box "Tìm tên hoặc quét mã vạch" (Enter on an exact barcode adds it to the cart), category chips (Tất cả + categories), helper line 'Số "Còn" tính theo lịch thuê đã chọn.' Grid cards: image, name, price ("150.000đ/ngày · 250.000đ/lần"; sale: sale price), stock line, "+" button. "Tải thêm" for the next page (60 per page).
   - Stock line from `POST /api/products/batch-availability` for the shown products (≤100 per call, Vietnam day range of the chosen days, outlet of the order, `excludeOrderId` when editing): "Còn n/m" green, "Hết trong lịch này" grey and the card faded (the "+" still works, the cart line then shows a warning). Sale orders: today's free stock. No days yet: "Chọn ngày để xem còn hàng".
   - A product in the cart has a 2px primary border.
5. **Cart**
   - Thuê / Bán switch (locked when editing). Switching reprices lines (`repriceOrderLineForOrderType`).
   - Customer button: name · phone, "Đổi". Dialog: search (`GET /api/customers?search=`), pick; "Thêm khách mới" with name and phone (`POST /api/customers`).
   - Lines "ĐỒ THUÊ · n MÓN" / "ĐỒ BÁN · n MÓN": name, line total, price option select (rent, when the product has options: "Theo ngày · X/ngày", "Theo lần · X/lần", "Theo giờ · X/giờ"), − qty +; qty 0 removes. A line over the free units shows "Chỉ còn n trong lịch này" in red.
   - "Thêm ghi chú, ảnh": notes; up to 5 photos on create (sent with the order). Editing keeps saved photos as they are (photos are edited on the order page).
   - Totals: Tiền thuê / Tiền hàng, Giảm giá ("Thêm" → amount or %, capped as today), loyalty points when the customer can redeem, Tổng đơn.
   - Rent: "Thu cọc ngay" (prefilled with Σ product deposit × qty until typed) and "Thế chân khi giao" (security deposit); "Còn thu khi giao" = total − cọc + thế chân (same as the order page).
   - Submit 52px: "Tạo đơn · thu cọc X" (rent with cọc), "Tạo đơn", edit "Lưu thay đổi". Disabled with the first missing thing named: days, customer, items.
6. **After create**: the receipt preview as today, then the new order page. After edit: back to the order page.
7. **Outlet**: the user's outlet, else the merchant's default / first outlet; a select when the merchant has more than one and the user is not tied to one.

## Payload (unchanged fields)

`orderType, customerId, outletId, pickupPlanAt, returnPlanAt` (Vietnam midnight ISO, rent only), `subtotal, taxAmount 0, discountType, discountValue, discountAmount, depositAmount, securityDeposit, totalAmount, notes, orderItems[{productId, quantity, unitPrice, totalPrice, deposit, notes, rentDays, pricingType, pricingOptionId?}]`, `loyaltyRedeem?`.
Item `deposit`: POST divides it by quantity, PUT stores it as is, so create sends deposit × qty and edit sends the per-unit deposit; both save the per-unit value (the old form saved deposit ÷ qty on create).

## Edit `/orders/[number]/edit`

Same screen with the order: days, customer, lines (pricing type and option kept), discount, cọc, thế chân, notes. Not editable orders (rule above) show a notice with a link back.
