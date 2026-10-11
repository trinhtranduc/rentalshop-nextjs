# Spec #825

Role chi nhánh = `isOutletRole` (OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY).

**Quyết định cuối của chủ shop (2026-10-11):** OUTLET_ADMIN và OUTLET_INVENTORY (Nhân viên kho) có cùng quyền sản phẩm:
tạo (tồn ở chi nhánh mình), sửa trường dùng chung (tên, giá, ảnh, danh mục, mô tả...), sửa tồn chi nhánh mình, xóa sản phẩm
có tồn ở chi nhánh mình. Chỉ OUTLET_STAFF bị giới hạn: không tạo, không sửa trường dùng chung, không xóa. Mọi role chi nhánh
chỉ ghi tồn ở chi nhánh mình. (PR #829 đã merge theo quyết định cũ "chỉ chủ shop"; PR tiếp theo áp dụng quyết định cuối.)

## PUT /api/products/[id]
- Mọi kiểm tra quyền chạy **trước** khi tải ảnh lên S3 (sản phẩm tồn tại, cùng shop, luật chi nhánh).
- Role chi nhánh không có `userScope.outletId` → 403 `OUTLET_REQUIRED` (trước đây bỏ qua kiểm tra).
- OUTLET_STAFF (chỉ khi shop tự thêm `products.update`; mặc định role này không có): 403 `PRODUCT_SHARED_FIELDS_MERCHANT_ONLY`
  khi có file ảnh, hoặc khi một trường dùng chung **khác** giá trị đã lưu (`changedSharedFields`,
  `apps/api/lib/product-branch-rules.ts`): name, description, barcode, rentPrice, salePrice, costPrice, deposit, categoryId,
  images, isActive, pricingType, durationConfig, pricingOptions, merchantId. Gửi lại cả payload với giá trị cũ vẫn được; khi
  qua kiểm tra chỉ ghi `outletStock`.
- Mọi role: mỗi `outletStock[].outletId` phải là chi nhánh cùng shop với sản phẩm; không có hoặc khác shop → 404
  `OUTLET_NOT_FOUND`, không ghi gì (trước đây bỏ qua chi nhánh không có, ghi vào chi nhánh shop khác).
- Giữ nguyên: role chi nhánh chỉ ghi tồn chi nhánh mình (`CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET`), `PRODUCT_NOT_AVAILABLE_AT_OUTLET`,
  user không có `products.manage` bị bỏ trường giá.

## "Chi nhánh có sản phẩm" (`holdsStockAt`)
- Từ #825 mọi sản phẩm có dòng tồn ở mọi chi nhánh active (0 nếu chi nhánh chưa nhập). Dòng 0 **không** tính là chi nhánh có
  sản phẩm: OUTLET_ADMIN / kho chỉ sửa trường dùng chung và xóa sản phẩm mà chi nhánh mình có tồn (> 0) hoặc đang cho thuê;
  không có → 403 `PRODUCT_NOT_AVAILABLE_AT_OUTLET` (như trước #825 khi chưa có dòng). Sửa tồn chi nhánh mình thì luôn được.
- Web: form của OUTLET_ADMIN / kho với sản phẩm chi nhánh chưa có thì khóa trường dùng chung, có dòng giải thích.

## GET /api/products (danh sách)
- Role chi nhánh: số "còn hôm nay" / tồn của dòng luôn tính theo chi nhánh của mình, bỏ qua `outletId` của chi nhánh khác
  trong query (trước đây đọc được số của chi nhánh khác khi sản phẩm có dòng ở cả hai). Sản phẩm của chi nhánh khác nay
  hiện trong danh sách với số 0 (theo quyết định "mọi sản phẩm có ở mọi chi nhánh").

## DELETE /api/products/[id], POST /api/products/batch-delete
- OUTLET_STAFF → 403 `PRODUCT_DELETE_MERCHANT_ONLY` (mặc định role này không có `products.manage` nên đã bị chặn).
- OUTLET_ADMIN, OUTLET_INVENTORY: xóa được sản phẩm chi nhánh mình có (`holdsStockAt`); không có → 403
  `PRODUCT_NOT_AVAILABLE_AT_OUTLET`, cả DELETE và batch-delete (batch-delete trước đây không kiểm tra chi nhánh).

## Tạo sản phẩm (POST /api/products, POST /api/products/bulk-import)
- Thêm dòng tồn 0 cho mọi chi nhánh active khác của shop (`zeroStockRowsForOtherOutlets`). Role chi nhánh vẫn chỉ nhập tồn chi nhánh mình.
- Role chi nhánh không có `outletId` → 403 `OUTLET_REQUIRED`.
- OUTLET_STAFF → 403 `INSUFFICIENT_PERMISSIONS` (kể cả khi shop tự thêm `products.create`); `ROLE_PERMISSIONS` và
  `CRITICAL_PERMISSIONS` của OUTLET_STAFF bỏ `products.create`.

## /api/merchants/[id]/products (route của admin web)
- PUT `/[productId]`: sản phẩm phải thuộc merchant trong URL (trước đây nhận mọi id sản phẩm) → 404 `PRODUCT_NOT_FOUND`;
  chi nhánh trong `outletStock` phải thuộc merchant đó → 404 `OUTLET_NOT_FOUND`, kiểm tra trước khi ghi.
- PUT và POST: role chi nhánh → 403 `INSUFFICIENT_PERMISSIONS` (dùng `/api/products`, có luật chi nhánh).

## Ngoài phạm vi (chưa chốt)
- OUTLET_ADMIN / Nhân viên kho xem tồn chi nhánh khác (chỉ đọc): giữ như hiện tại.
- Bù dòng tồn 0 cho chi nhánh đã có (backfill một lần): PR riêng.

## Web shop
- OUTLET_STAFF sửa sản phẩm (nếu shop cho quyền): các trường dùng chung khóa, có dòng giải thích; chỉ gửi `{ id, outletStock }`.
- OUTLET_ADMIN / kho: form mở như chủ shop; chỉ gửi dòng tồn chi nhánh mình; thấy nút xóa.
- Ẩn nút xóa và "Thêm sản phẩm" với OUTLET_STAFF.

## Test
- `tests/api/product-branch-rules.test.ts`; `tests/api/product-update-keeps-renting.test.ts` (outlet mock có merchant);
  `tests/api/product-soft-delete.test.ts` (như trước #825); `tests/web-products-form.test.ts`; `tests/packages/auth/inventory-role.test.ts`.
- E2E: `tests/e2e/business/{staff-permissions,inventory-role,roles-flows}.e2e.test.js` (BF-STAFF-03, BF-INV-16, BF-ROLE-06, BF-ROLE-14, ma trận quyền).
