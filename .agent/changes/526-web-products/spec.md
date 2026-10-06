# Spec — #526 Shop web Sản phẩm

Issue: #526 · Status: accepted · Intent: ./intent.md

## `/products`

1. **Header**: h1 "Sản phẩm"; "Xuất Excel" (exports every product matching the filters), "Nhập từ Excel" → `/products/import`,
   "Thêm sản phẩm" → `/products/add`, "⋯" with "Đồng bộ tìm bằng ảnh". Each shown only with its permission (intent).
2. **Tabs**: "Tất cả sản phẩm · N" (N = products in the shop) and "Danh mục · M" → `/categories`.
3. **Filters (URL)**: `q` (search box "Tên hoặc mã vạch", 350 ms after typing or Enter), `category` (chips "Tất cả" + categories
   with `_count.products`), `outlet` (merchant with more than one outlet; changes the stock shown, not the products), `sort`
   (Tên A–Z default, Mới thêm, Giá thuê thấp/cao trước), `page`, `limit` (10 default, 20, 50, 100). "Tìm bằng ảnh" opens the
   existing photo search; its results replace the table until cleared.
4. **Table** (cards under 768px): checkbox, photo + name + barcode (→ `/products/[id]`), category, "Thuê theo lần" (FIXED option,
   or rentPrice when the product has no options and is FIXED; hourly products show "x/giờ"), "Thuê theo ngày" (DAILY option or
   DAILY rentPrice), "Giá bán" (— when empty), "Hôm nay" ("Còn a/t" green or "Hết" red, then "n đang thuê"), "Sửa" →
   `/products/[id]/edit`, "⋯" (Xem chi tiết, Xem đơn có sản phẩm này, Xoá sản phẩm). Stock is the API rollup, or the row of the
   outlet in scope (URL outlet, or the outlet of an outlet user).
5. **Selection**: header checkbox selects / clears the page (indeterminate when some). Bar: "Đã chọn n sản phẩm", "Chọn cả N sản
   phẩm" (every match, across pages), "Bỏ chọn", "Xoá (n)", "Xuất Excel (n)". Cleared when the filters change.
   Export sends `productIds` (selection, or up to 3000 ids of the matches) with `format=excel`; file `san-pham-YYYY-MM-DD.xlsx`
   (Vietnam day). Delete asks in a themed dialog, then `batch-delete` (or `DELETE` for one row).
6. Loading skeletons, "Không tải được… Thử lại", empty texts; light and dark; 390px without page scroll.

## `/products/import`

1. Back link "Sản phẩm", h1 "Nhập sản phẩm từ Excel", stepper: 1 Chọn file đã điền (+ "Tải file mẫu sản phẩm (.xlsx)"),
   2 Kiểm tra và nhập, 3 Kết quả. Needs `products.manage`.
2. **Choose**: drop zone / "Chọn file" (.xlsx, .xls, .csv). The first sheet is read with `xlsx` into a matrix; header = first
   non-empty row; blank rows skipped; row numbers are the file's. Refused: no data rows, no name column, more than 3000 rows.
3. **Check**: headers matched without accents/case (template's English headers, old aliases, Vietnamese). Per row: name required;
   Giá thuê / Giá bán / Giá vốn / Tiền cọc are numbers ≥ 0 ("250.000", "250,000đ" accepted); Số lượng whole ≥ 0; Danh mục must
   exist (empty → default); a barcode repeated in the file is an error after its first row. Error cells red, "Kiểm tra" names the
   error. File line with "n dòng hợp lệ / n dòng lỗi", "Đổi file"; tabs "Tất cả n" / "Lỗi trước · n"; valid rows ticked
   (untick to leave out); first 100 rows then "Xem thêm"; CTA "Nhập n sản phẩm".
4. **Result**: `bulkImport` of the ticked valid rows with the old dialog's fields (`name, description?, barcode?, categoryName |
   'default', rentPrice, salePrice, costPrice, deposit, stock`). Shows imported, skipped (barcode already in the shop), or the
   API's rejected rows mapped back to file rows. "Xem danh sách sản phẩm", "Nhập file khác".
