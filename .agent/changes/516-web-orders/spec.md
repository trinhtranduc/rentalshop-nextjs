# Spec — #516 Shop web Đơn hàng + Chi tiết đơn

Issue: #516 · Status: accepted · Intent: ./intent.md

## Order list `/orders`

1. **Header.** Title "Đơn hàng"; buttons "Xuất Excel" (only with export permission) and "Tạo đơn" → `/orders/create`. A search from the top bar (`?q=`) shows as a removable chip.
2. **Tabs** (`?tab=`):
   - **Việc cần làm** (`todo`): from `outlet-operations`, hand-overs today, returns today and late returns, each order once. Red badge = number of rows.
   - **Tất cả đơn** (default).
   - **Chưa lấy đồ** (`noshow`): `outlet-operations.noShows`. Red count.
3. **Status chips** on Tất cả đơn: Tất cả, Đã đặt, Đang thuê, Đã trả, Hoàn thành, Đã huỷ, each with its count under the current type / date / search filters (`GET /api/orders` with `limit=1`, read `total`).
4. **Filters**: Loại (Thuê + Bán, Thuê, Bán) → `orderType`; Ngày tạo (all, 7 days, 30 days, this month, custom from–to) → `startDate`/`endDate` Vietnam day keys; Sắp xếp (Mới tạo nhất, Cũ nhất, Việc gần nhất `nearestTask`, Tổng tiền cao nhất). All kept in the URL.
5. **Table** columns: Trạng thái, Khách · mã đơn ("#n · tạo T2 05/10"), Lịch, Ghi chú, Tổng, Thanh toán. Row → order page.
   - Lịch: reserved rent "Giao T3 06/10 · trả T5 08/10"; renting "Trả T3 06/10", or "Hạn trả …" when late; returned "Đã trả …"; sale "Bán …"; cancelled "Huỷ …" (updatedAt).
   - Ghi chú: late return "Trễ n ngày" (red); reserved past its hand-over day "Quá n ngày · nên gọi khách" (red); not prepared "Chưa soạn đồ" (orange); sale "Đơn bán" (grey).
   - Thanh toán from the row's `amountDue` / `refundDue`: "còn thu X" (orange, red when the pickup is overdue), "+ phí trễ X" (red, late return), "hoàn cọc X" (purple), cancelled "không tính doanh thu" (grey), nothing when settled.
   - Cancelled rows are faded and their total is struck through.
6. **Footer**: "Hiển thị [10/20/50/100] dòng mỗi trang" (`?limit=`, default 10), "a–b trong N đơn", previous / page numbers / next.
7. Loading shows skeleton rows; a failed load shows a retry line; an empty result says so.

## Order page `/orders/[number]`

1. **Header**: back link "Đơn hàng"; status pill, customer name (h1), "Đơn thuê"/"Đơn bán"; line "#n · tạo HH:mm T2 05/10 bởi X · outlet". Buttons In phiếu, Sửa đơn (same rule as today), ⋯ menu with Huỷ đơn / Xoá đơn (permission `orders.delete`, same rules as today).
2. **Left column**
   - Progress (rent, not cancelled): Đã đặt (created time), Giao đồ (time done, or plan day; "Hôm nay · …" when today), Trả đồ (same). Reached steps get a blue bar.
   - Đồ thuê / Đồ bán: "Đã soạn đồ" checkbox for reserved rentals (`PUT isReadyToDeliver`), then item rows: image, name, "SL n · mã barcode · Theo ngày · X/ngày × n ngày", line total.
   - Ghi chú: general, pickup, return and damage notes with photos; "Sửa ghi chú" opens the existing settings editor.
   - Lịch sử: built from the order: created (by whom), completed payments, handed over, returned, cancelled; newest first.
3. **Right column**
   - Việc tiếp theo (reserved or renting rent): title ("Giao đồ hôm nay", "Giao đồ T5 08/10", "Quá n ngày chưa giao", "Nhận trả hôm nay", "Trễ trả n ngày"…), 52px button "Giao đồ · thu X" / "Nhận trả · thu X" / "Nhận trả · hoàn X", which opens the existing hand-over / take-back dialog.
   - Thanh toán: lines by state, total line "Còn thu khi giao" / "Thu thêm khi trả" / "Hoàn lại khi trả" / "Còn thu" / "Đã thanh toán đủ" / "Không tính doanh thu". Same balance rule as the API (`computeOrderBalance`). Collateral money box when set.
   - Thế chấp & phí: the existing settings card (edit collateral, security deposit, damage fee, notes and photos).
   - Khách hàng: name, phone with a call button, email; "Xem khách" → `/customers/[id]`.
4. Load error and not-found states in the new style.
