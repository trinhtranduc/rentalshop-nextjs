# Spec — #527 Shop web Lịch giao trả + Kiểm tra còn hàng

Issue: #527 · Status: accepted · Intent: ./intent.md

## `/calendar` — Lịch giao trả

1. **Header**: h1 "Tháng 10, 2026", ‹ › (previous / next month), "Hôm nay"; legend Giao (blue dot), Trả (purple ring), Trễ hạn trả (red square). Month and day live in the URL (`?month=&year=&day=`; old `from`/`to` are dropped).
2. **Month grid** (Monday first, whole weeks, 35 or 42 cells): day number (today: filled blue circle; other months faded), "Giao n" from `byDate[day].pickups` (RESERVED by planned pickup day), "Trả n" from `byDate[day].returns` (PICKUPED by planned return day), "Trễ n" on today from `lateReturns`. An older API without `byDate` shows `countByDate` as hand-overs. Phones show dots with numbers only. The chosen day has a 2px primary inset border. Retry line when counts fail.
3. **Day panel** "T3 06/10 · hôm nay": "CẦN GIAO · n" (by-date, RESERVED) and "CẦN NHẬN TRẢ · n" (by-date `kind=return`; on today also the late returns from outlet-operations, each order once). Row: customer (or "Khách lẻ"), "#số · trả T5 08/10 · chưa soạn đồ" / "giao và trả trong ngày" / "giao CN 04/10" / "hạn trả T6 02/10 · trễ 4 ngày" (red), product names, money "còn thu X" / "hoàn cọc X" / "thu thêm X". Each row links to `/orders/<orderNumber>`. 50 per page with "Xem thêm". Skeletons and retry. On phones a tap on a day scrolls to the panel.

## `/availability` — Kiểm tra còn hàng

1. **Form**: Sản phẩm (search combobox, `GET /api/products?q=&outletId=`), Ngày giao, Ngày trả (return ≥ pickup), Số lượng, "Kiểm tra" (re-runs); quick chips Hôm nay / Ngày mai / Cuối tuần / 3 ngày. Outlet select only for a merchant with several outlets and no own outlet. URL: `productId, pickup, return, qty, outletId`. Default period: today → today + 2.
2. **Result**: thumbnail, name, "Có m cái · T4 07/10 → T6 09/10"; pill "Còn n/m cho cả lịch này" (green) / "Thiếu k · còn n/m" / "Hết trong lịch này" (red), from the outlet row of `GET /api/products/{id}/availability` (Vietnam day range, `timeZone`); "Tạo đơn với lịch này" → `/orders/create?productId=&pickup=&return=&outletId=`.
3. **Day strip** (14+ days from two days before the pickup, scrolls sideways inside the card): weekday + day, today in blue, period columns light blue; "Còn lại trong ngày" = stock − units of active rentals covering the day (both ends, sales excluded), red when below the quantity, amber when exactly enough, green otherwise; a tap moves the period to start that day. Below: one row per active order of the product (name, "#số · Đã đặt/Đang thuê · n cái") with a bar over its days ("06/10 → 08/10", renting: "trả 05/10"), outlined when it overlaps the period; orders outside the strip are listed under it.
4. **Cùng danh mục, còn trong lịch này**: same-category products (≤20 fetched, batch availability for the period) with free ≥ quantity, most free first, up to 5; a tap checks that product.

## Day rules

Day keys come from `getLocalDateKey` (instant → Vietnam day) and `formatDateKeyInTimeZone(now, SHOP_TIMEZONE)`; all arithmetic on `YYYY-MM-DD` in UTC. Tests run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
