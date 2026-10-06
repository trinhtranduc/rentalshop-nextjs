# Spec — Shop web product form, product page and product orders

Issue: #547 · Status: accepted · Intent: ./intent.md

## Behavior

### Shell
1. `ClientLayout` renders `/products/[id]/edit`, `/customers/[id]/edit` and `/orders/[id]/edit` inside `ShopShell` (no
   full-width exception for `/edit`).

### `/products/add` and `/products/[id]/edit` (one `ProductFormPage`)
2. Page container like Tạo đơn / Khách hàng; back link ("Sản phẩm" on add, the product name on edit), h1 "Thêm sản phẩm" /
   "Sửa sản phẩm". Two columns ≥1024 px (main: Thông tin, Ảnh, Giá, Số lượng; side: Phân loại & mã, Tìm bằng ảnh on edit),
   one column below. Sticky footer bar with "Huỷ" and "Thêm sản phẩm" / "Lưu thay đổi".
3. Fields: Tên sản phẩm (required), Mô tả, Danh mục (required, first category preselected), Mã vạch (+ "Tạo mã"; a new
   product gets a generated code), Ảnh (≤ 3 in total, jpg / png / webp, ≤ 5 MB each; saved photos shown on edit and removable),
   Giá thuê theo lần, Giá thuê theo ngày, "Khi tạo đơn, mặc định tính" Theo lần / Theo ngày, Tiền cọc, Giá bán, Giá vốn,
   Số lượng (one outlet) or Số lượng per outlet (several outlets; total is the sum).
4. Price fields (both rent prices, default mode, Giá bán, Giá vốn) are shown and sent only when the user has
   `products.manage` and is not `OUTLET_STAFF`. Tiền cọc is shown to everyone (same as today).
5. Validation (same rules as the old form): name required; category required; no negative price; a "Theo ngày" default
   needs a per-day price; Giá bán > 0 when prices are shown; deposit ≥ 0; total quantity > 0; outlet stock ≥ 0.
   Errors show under the field; the first one gets focus.
6. Payload create: `name, description, barcode, categoryId, totalStock, deposit, images: [], outletStock` + with price rights
   `rentPrice` (default option price or 0), `salePrice`, `pricingOptions` (priced options only, one default), `costPrice` if
   > 0. Edit: same plus `id`, `stock` (= totalStock), `merchantId`, and `images` = kept saved photo URLs. Files go as
   multipart `images` (unchanged `productsApi` calls). Create without price rights sends `rentPrice: 0` (required by the
   create schema; the API default).
7. After create → `/products/[newId]`; after save → `/products/[id]`. API failure → toast with the message, form stays.
8. No create permission → "Bạn không có quyền thêm sản phẩm"; `OUTLET_STAFF` (no update) on edit → "Bạn không có quyền sửa
   sản phẩm" with a link back. Missing categories / outlets → message with a link to Danh mục / Chi nhánh.
9. Edit, `products.manage`: "Tìm bằng ảnh" card with status (Sẵn sàng / Chưa có / Đang cập nhật) and "Cập nhật"
   (`syncProductEmbeddings`), as on the old edit page.

### `/products/[id]`
10. Back link "Sản phẩm", h1 name + barcode; actions "Kiểm tra còn hàng" (→ `/availability?productId=`), "Xem đơn hàng",
    "Sửa" (update permission), "Xoá" (`products.manage`, themed confirm, `deleteProduct`; refused delete stays on the page).
11. Cards: Ảnh (click opens the photo), Giá (Thuê theo lần, Thuê theo ngày, default marked "Mặc định", Tiền cọc, Giá bán,
    Giá vốn only with `products.manage`), Mô tả, Tồn kho theo chi nhánh (Tổng, Có sẵn, Đang cho thuê, Tổng cộng row).
    Side: Phân loại & mã (Danh mục, Mã vạch, Tạo / cập nhật in Vietnam time).
12. Skeleton while loading; "Không tìm thấy sản phẩm" with back link on error.

### `/products/[id]/orders`
13. Back link to the product, h1 "Đơn có {name}", three stock tiles (Tổng số lượng, Có sẵn, Đang cho thuê).
14. Status chips (Tất cả + 5 statuses, each with a count), the redrawn Đơn hàng table (same row facts, Vietnam days), footer
    with page sizes. Data: `ordersApi.searchOrders({ productId, status, page, limit })`. State in the URL.

## Out of scope

API changes, `packages/**`, the admin app, the list page, mobile.

## API and data

No change. Numeric `id` only.

## Acceptance

- [ ] Model tests (`tests/web-products-form.test.ts`) in `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [ ] Browser: create, edit (price + photo), detail, orders; MERCHANT light/dark 1440 + 390; OUTLET_STAFF
- [ ] Mobile parity / API compat: not affected (no API change)
- [ ] New strings in en + vi `products.json` → `web` (ja / ko / zh have no `products.json`)
