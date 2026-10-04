# Spec — Mobile products, product form, rent and sale cart

Issue: #373 · Status: accepted · Intent: ./intent.md

## Behavior

1. Flag `newProducts` off → old Home, product form and cart, unchanged. On → new screens (read when the tab is built).
2. Product list [SP-dong]: header (shop name, title), search field (`q`, as you type, 300 ms), barcode scan button,
   category chips (Tất cả + `GET /api/categories`, filtered client-side on the loaded page), rows with image,
   name, category · barcode, "Còn N" / "Hết hôm nay" (`effectiveAvailableToday` / `available`), price per rental,
   per day and sale price when set, "+" adds to the cart. Paged, pull to refresh. A floating bar shows the cart
   ("Giỏ hàng · N món", total) and opens the cart. "+" in the header (create rights) opens the add form.
3. Barcode scan on the list calls `GET /api/products?q=<code>` and keeps only the product whose barcode equals the
   code (trimmed, case-insensitive); one match opens its detail; none shows "Không tìm thấy mã …".
4. Product detail [SP-chi-tiet]: photos (paged), name, category · barcode · deposit, price tiles Theo lần / Theo ngày /
   Giá bán (only those set), stock "Đang cho thuê X · còn trống Y" (rented = total − available), orders of the product
   (`GET /api/orders?productId=`, newest first, status pill, tap opens order detail), bottom "Lịch trống" (existing
   availability screen) and "Thêm vào giỏ". "Sửa" only with `products.manage`/`products.update` (not `OUTLET_STAFF`).
5. Add / edit form [SP-tao, SP-sua]: up to 5 photos (first is the cover, remove with ×), name *, category picker,
   barcode with scan (on scan, an exact-match product other than this one shows "Mã vạch đã dùng cho …"), GIÁ
   section (Thuê theo lần, Thuê theo ngày, default pricing Theo lần / Theo ngày, Giá bán), Cọc mỗi món, KHO quantity
   stepper; edit shows "Đang cho thuê X · còn trống Y" under the quantity.
6. Form validation: name required; prices and deposit ≥ 0; default "Theo ngày" needs a per-day price > 0; quantity
   ≥ 0; on edit quantity ≥ rented (same rule as the API `STOCK_BELOW_RENTED`); at most 5 photos.
7. `OUTLET_STAFF` sees no GIÁ section in the form (create sends no prices), cannot open edit, and sees no price edit in
   the cart. API errors map to a clear message: `STOCK_BELOW_RENTED` → "Số lượng không được thấp hơn số đang cho thuê".
8. Cart [Gio-hang, Gio-hang-ban]: one screen with a Thuê / Bán switch (locked when editing an order).
   - Thuê: customer row, date range row ("T7 03/10 → T2 05/10", "N ngày" inclusive), items with image, line total,
     calc line ("150.000đ/ngày × 3 ngày", "300.000đ/lần × 2"), Theo lần / Theo ngày only when the product has both
     prices, quantity stepper, availability warning from batch availability ("Chỉ còn N trống"); money: Tiền thuê,
     Giảm giá, Tổng đơn, Cọc trả trước (editable), Ghi chú; bottom "Thu ngay · cọc X" + "Tạo đơn".
   - Bán: no dates, no deposit; calc "Giá bán X × n", "Còn N trong kho", warning when stock < quantity; money Tiền hàng,
     Giảm giá, Tổng đơn, Ghi chú; bottom "Khách trả X" + "Bán & thu tiền".
   - The CTA validates (items, customer, dates for rent) and opens the existing order preview, which creates the order
     and collects payment. Totals come from the existing cart store.

## Out of scope

Delete product (API PR 1b), image search redesign, 7-day free strip on the detail, any API change.

## API and data

Reads only, plus the existing product create/update multipart. Edit sends the kept photo URLs in `images` with the
new files (the API combines them). Numeric ids only.

## Acceptance

- [ ] Unit tests on both apps: price visibility by role, cart totals (per rental, per day, sale), form validation,
      error mapping, barcode exact match
- [ ] iOS and Android both ship the screens behind `newProducts`
- [ ] New strings in vi and en (the apps have no ja/ko/zh)
- [ ] Staff vs merchant checked against a local API
