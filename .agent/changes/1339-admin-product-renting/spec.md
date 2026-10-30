# Spec — Admin sửa sản phẩm giữ số đang thuê

Issue: #1339 · Status: in-progress · Intent: ./intent.md

## Behavior

Route: `PUT /api/merchants/[id]/products/[productId]`, body có `outletStock: [{ outletId, stock }]`.

1. Với mỗi mục có `outletId` và `stock` là số: dòng `OutletStock` (sản phẩm, chi nhánh) có sẵn thì `stock = <mới>`,
   `available = stock - renting`, `renting` giữ nguyên. Chưa có dòng thì tạo `renting: 0`, `available = stock`.
2. Không xoá dòng nào. Chi nhánh không có trong payload giữ nguyên dòng (trước đây bị xoá).
3. `stock < renting` của bất kỳ mục nào thì 400 `STOCK_BELOW_RENTED`, KHÔNG ghi gì (cả trường chung của sản phẩm).
4. Chi nhánh không thuộc shop trong URL: 404 `OUTLET_NOT_FOUND`, không ghi gì (như hôm nay).
5. Sản phẩm không thuộc merchant trong URL: 404 `PRODUCT_NOT_FOUND`. Role chi nhánh: 403 `INSUFFICIENT_PERMISSIONS`.
6. Response: `{ success: true, data: <sản phẩm sau khi lưu, như db.products.findById> }`, không đổi.
7. Không có `outletStock` (hoặc mảng rỗng): không đụng dòng tồn nào (như hôm nay).

## Edge cases

- `stock === renting`: cho phép, `available = 0`.
- Hai mục cùng một chi nhánh: mục sau thắng (upsert tuần tự), cả hai đều qua kiểm `renting`.
- `stock` âm: nhỏ hơn `renting >= 0` nên 400 `STOCK_BELOW_RENTED` (trước đây ghi số âm).

## Compatibility

Chỉ web admin gọi (`packages/utils/src/api/merchants.ts:271`). iOS/Android không gọi. Lỗi 400 hiện qua `data.message`
(`apps/admin/app/merchants/[id]/products/[productId]/page.tsx:77-79`), thông điệp tiếng Anh có sẵn ở `ResponseBuilder`. Không mã lỗi mới.

## Out of scope

`isListed`, `totalStock` đồng bộ, đổi `products/[id]/route.ts`.
