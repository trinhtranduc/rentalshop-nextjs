# Spec #825

Role chi nhánh = `isOutletRole` (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY).

## PUT /api/products/[id]
- Mọi kiểm tra quyền chạy **trước** khi tải ảnh lên S3 (sản phẩm tồn tại, cùng shop, luật chi nhánh).
- Role chi nhánh không có `userScope.outletId` → 403 `OUTLET_REQUIRED` (trước đây bỏ qua kiểm tra).
- Role chi nhánh: 403 `PRODUCT_SHARED_FIELDS_MERCHANT_ONLY` khi có file ảnh, hoặc khi một trường dùng chung **khác**
  giá trị đã lưu (`changedSharedFields`, `apps/api/lib/product-branch-rules.ts`): name, description, barcode, rentPrice,
  salePrice, costPrice, deposit, categoryId, images, isActive, pricingType, durationConfig, pricingOptions, merchantId.
  Gửi lại cả payload với giá trị cũ (app mobile, tab web cũ) vẫn được; khi qua kiểm tra chỉ ghi `outletStock`.
  `totalStock`, `outletStocks`, `durationLimits`, `stock` bỏ qua (tổng tồn tính lại từ `outletStock`).
- Mọi role: mỗi `outletStock[].outletId` phải là chi nhánh cùng shop với sản phẩm; không có hoặc khác shop → 404
  `OUTLET_NOT_FOUND`, không ghi gì (trước đây bỏ qua chi nhánh không có, ghi vào chi nhánh shop khác).
- Giữ nguyên: role chi nhánh chỉ ghi tồn chi nhánh mình (`CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET`), `PRODUCT_NOT_AVAILABLE_AT_OUTLET`,
  MERCHANT không có `products.manage` bị bỏ trường giá.

## DELETE /api/products/[id], POST /api/products/batch-delete
- Role chi nhánh → 403 `PRODUCT_DELETE_MERCHANT_ONLY` (trước: OUTLET_ADMIN / Nhân viên kho xóa được sản phẩm có tồn ở chi nhánh mình).

## Tạo sản phẩm (POST /api/products, POST /api/products/bulk-import)
- Thêm dòng tồn 0 cho mọi chi nhánh active khác của shop (`zeroStockRowsForOtherOutlets`). Role chi nhánh vẫn chỉ nhập tồn chi nhánh mình.
- POST /api/products: role chi nhánh không có `outletId` → 403 `OUTLET_REQUIRED`.

## Web shop
- Sửa sản phẩm với role chi nhánh: các trường dùng chung (tên, mô tả, ảnh, giá, cọc, danh mục, mã) khóa, có dòng giải thích;
  chỉ sửa tồn chi nhánh mình; payload chỉ `{ id, outletStock: [chi nhánh mình] }`.
- Nút xóa sản phẩm (chi tiết, danh sách, xóa nhiều) ẩn với role chi nhánh.

## Test
- `tests/api/product-branch-rules.test.ts` (mới); `tests/api/product-update-keeps-renting.test.ts` (outlet mock có merchant);
  `tests/api/product-soft-delete.test.ts` (outlet admin xóa → `PRODUCT_DELETE_MERCHANT_ONLY`); `tests/web-products-form.test.ts` (payload chỉ tồn).
