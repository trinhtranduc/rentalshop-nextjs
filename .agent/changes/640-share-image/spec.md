# Spec — share image

Status: accepted · Intent: ./intent.md · Mockups: ./mockups/

Canvas 540 pt/dp wide, drawn at 2× → 1080 px JPG. Font: system (SF / Roboto); the mockup's Be Vietnam Pro is only
a stand-in. Ground `#EEF2F7`, cards white radius 20, ink `#0F172A`, muted `#475569`, accent `#1D4ED8`.

1. **Header** (accent band): initials tile (first letters of the first two words of the shop name, white tile,
   accent text), shop (merchant) name, "<outlet name> · <outlet phone>"; small caps line = order kind ("Đơn thuê" /
   "Đơn bán", draft: "Đơn thuê · lập <T4 07/10>"), big line = `#<orderNumber>` (draft: "Đơn nháp"); status pill:
   rent RESERVED "Chờ giao đồ", PICKUPED "Đang thuê", RETURNED "Đã trả đồ", sale COMPLETED "Đã thanh toán",
   CANCELLED "Đã huỷ", draft "Chưa chốt" (orange `#FFEDD5`/`#9A3412`).
2. **Customer card** (overlaps the band): "Khách hàng", name, phone right. Rent and draft-rent: the strip
   Nhận đồ `<T4 07/10>` · `<N ngày>` · Trả đồ `<T6 16/10>`, Vietnam civil days, N counted like the app's rental days.
   No customer: the card shows "Khách lẻ".
3. **Items card**: "ĐỒ THUÊ · N MÓN" / "HÀNG MUA · N MÓN"; per line name, `qty × unit price`, line total.
   Totals: rent "Tổng tiền thuê", "Đã đặt cọc − x" (when > 0), "Thế chân khi nhận đồ" (collateral type + amount,
   when any), highlight "Còn phải trả" = the amount due the order detail screen already shows; sale "Tạm tính",
   "Giảm giá − x" (when > 0), highlight "Tổng cộng" (green `#ECFDF5`/`#047857`); draft "Cọc giữ đồ", "Thế chân…",
   highlight "Tạm tính" (orange `#FFF7ED`) and the note "Đơn chưa chốt. Shop sẽ xác nhận lịch và giá trước khi giữ đồ."
4. **VietQR card** (orders only, not drafts): when the app's existing "QR chuyển khoản trên hoá đơn" switch is on
   and the outlet has a default active bank account: the QR (same VietQR string the printed bill uses, amount = the
   amount due when > 0), bank name, account number, holder, "Nội dung: DH<orderNumber>".
5. **Footer**: "Cảm ơn quý khách đã tin chọn <shop>", outlet address (when any), "Tạo bằng AnyRent".
6. Money `1.150.000đ` (dot thousands, no decimals) in every language; days `T4 07/10` (vi) / `Wed 07/10` (en).
7. **Language**: all labels in the app's current language (vi, en); no mixed-language labels.
8. **Where**: order detail ⋯ → Chia sẻ đơn (both apps; replaces the old image there and in the old preview screen);
   cart: a share button in the header, enabled when the cart has lines (rent: dates chosen), producing the draft.
9. Output: JPG ~92 quality, file `Order_<number>.jpg` / `Draft_<yyyyMMdd-HHmm>.jpg`, then the system share sheet.

Out of scope: per-shop colours, a separate share-language setting, printed bills, web.

Tests: a pure "share model" per platform (pill text by status, totals rows per kind, QR shown or not, initials,
day strip, money format, vi/en labels) with unit tests; rendering checked by exporting the three images on a
simulator / emulator and comparing with the mockups.
