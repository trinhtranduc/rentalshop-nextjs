# Spec — #526 Shop web Khách hàng

Issue: #526 · Status: accepted · Intent: ./intent.md

## `/customers`

1. **Header**: h1 "Khách hàng · {total}"; "Nhập từ Excel" (link to `/customers/import`, `customers.manage`), "Xuất Excel" (`customers.export`), "Khách mới" (link to `/customers/add`).
2. **Toolbar** in the list card: search "Tên hoặc số điện thoại" (debounced, `q` in the URL; the API matches word prefixes without accents, scoped to the caller's merchant). The board's sort menu is not drawn: `GET /api/customers` ignores `sortBy` (newest first).
3. **Table** (md+): checkbox, KHÁCH (name + phone), SỐ ĐƠN (`orderCount`), ĐỊA CHỈ, NGÀY THÊM (Vietnam day). Phones: one card per customer, linking to `/customers/{id}`.
   - Header checkbox selects / clears the whole page (indeterminate when part of it is chosen). The selection survives paging and is cleared by a new search.
   - Selection bar "Đã chọn n khách" · "Chọn cả N khách" (only when N ≤ 500: ids are fetched with one request) · "Bỏ chọn" · "Xuất Excel (n)" → `exportCustomers({ format: 'excel', customerIds })`.
   - "Xuất Excel" with nothing chosen opens a dialog with the old periods (30 days, 3 / 6 / 12 months, by date added) → `exportCustomers({ format: 'excel', period })`.
4. **Footer**: "Hiển thị [10|20|50|100] dòng mỗi trang", "a–b trong N khách", pages. `page` and `limit` in the URL (10 is the default and is not written).
5. **Detail panel** (lg+; smaller screens open `/customers/{id}`): clicking a row shows it; the first row is shown by default. Initials, name, phone · address, call button, "Sửa" (`/customers/{id}/edit`). Stats: Số đơn (`summary.totalOrders`), Đã chi (`summary.totalAmount`), Đang thuê (`total` of PICKUPED orders), "Đã chi không tính đơn huỷ." "ĐƠN CỦA KHÁCH": latest 5 orders (status tag, #number · tạo day, schedule line, total; cancelled faded and struck). Links "Tất cả đơn của khách" (`/customers/{id}/orders`), "Xem hồ sơ" (`/customers/{id}`), "Xoá khách" (`customers.manage`, confirm dialog).
6. Loading: skeleton rows; failure: "Không tải được danh sách khách." + "Thử lại".

## `/customers/import`

1. Back link "Khách hàng", h1 "Nhập khách hàng từ Excel", 3-step bar: 1. Chọn file (sample link), 2. Kiểm tra dòng lỗi, 3. Kết quả.
2. **Choose**: drop zone / button for `.xlsx, .xls, .csv`; same parser and column mapping as before (`parseExcelFile`, `CUSTOMER_COLUMN_MAPPING`). More than 3000 rows, no rows or an unreadable file shows the reason and stays on this step.
3. **Check**: file card (name, "n dòng · đọc xong lúc HH:mm", "x dòng hợp lệ", "y dòng lỗi", "Đổi file"); tabs "Tất cả n" / "Lỗi trước · y"; table DÒNG, HỌ TÊN, SỐ ĐIỆN THOẠI, EMAIL, ĐỊA CHỈ, GHI CHÚ, KIỂM TRA. Errors: "Thiếu họ tên", "Email sai định dạng", "Loại giấy tờ không hợp lệ"; the bad cell is red. Valid rows are checked (can be unticked), error rows cannot be ticked. 100 rows shown, "Xem thêm". Footer "Huỷ" / "Nhập n khách" → `bulkImport` with the ticked valid rows only.
4. **Result**: new, reopened, skipped (already there by phone / email) counts; when the API refused the batch, its row errors mapped back to the file's row numbers. "Về danh sách khách", "Nhập file khác".
