# Spec — #1215

## Việc 1: `salePrice` null với Android cũ
1. Client "Android cũ" = không có header `X-Client-Capabilities` hợp lệ VÀ `detectPlatform(request).deviceType === 'android'` (`X-Device-Type: android`, hoặc UA `okhttp` khi không có header nền tảng).
2. Với client đó, 5 endpoint Android cũ đọc bằng `parseProduct` (`GET /api/products`, `GET/PUT /api/products/[id]`, `POST /api/products`, `GET /api/products/searchByImage`) trả `salePrice: 0` thay `null`.
3. iOS cũ (`Product.swift:273-279` null an toàn; 0 làm ô giá bán điền "0" và lần lưu sau ghi 0), web, mọi client có capability: vẫn `null`.
4. Mọi field khác không đổi (golden). Chỗ đổi duy nhất: `apps/api/lib/legacy-sale-price.ts` + 5 chỗ gọi.
5. Đã cân nhắc bỏ khoá `salePrice` (Android cũ hiểu thành null và rơi về `rentPrice`, `Models.kt:255`) nhưng đó là xoá field, trái ràng buộc; chọn 0.

## Việc 2: không tạo FIXED trùng
1. Điều kiện: lưu qua `db.products.update` với `keepBlockOptions` (client không có `pricingSchemaVersion`), sản phẩm đang có option BLOCK.
2. Dòng FIXED trong payload có giá == giá ngày 1 của BLOCK, và sản phẩm chưa có option FIXED thật = bản shim app cũ gửi lại: bỏ, không tạo.
3. Nếu BLOCK đang `isDefault`, mọi dòng còn lại do payload tạo ra có `isDefault=false` (luôn đúng một dòng mặc định).
4. Payload chỉ còn shim => như payload rỗng: không đụng option, không ghi đè `rentPrice` 0 (đường #1200 có sẵn).
5. Sản phẩm có FIXED thật, hoặc giá FIXED khác giá ngày 1 (người dùng sửa): giữ nguyên hành vi hiện tại.
6. Dữ liệu đã trùng: chỉ truy vấn SELECT trong PR, chủ chạy; không migration.

## Việc 3: sửa spec #1199
`POST /api/orders` có `paymentPlan` ở shop chế độ "1 lần": 200, bỏ qua kế hoạch (`planForNewOrder` trả null, `installments.ts:76`). Spec dòng 55 và danh sách mã lỗi dòng 147 sửa cho khớp; không thêm `INSTALLMENT_MODE_DISABLED`.
