# Spec #1200

Status: in-progress

1. `payments[]` trong chi tiết đơn (GET/by-number/status/revert): thêm `paymentMethod` (= `method`) và `paymentDate` (= `processedAt ?? createdAt`, ISO có mili giây và `Z`, đúng định dạng decoder iOS `JSONHelper`). Giữ mọi field cũ.
2. `X-Client-Capabilities`: token cách nhau dấu phẩy, không phân biệt hoa thường; không header / giá trị sai = client cũ. Hàm `getClientCapabilities`, `hasCapability` (`apps/api/lib/client-capabilities.ts`). CORS cho phép header ở 3 nơi. Web: `CLIENT_CAPABILITIES = []` (`packages/utils/src/core/client-capabilities.ts`), chỉ gửi header khi danh sách không rỗng.
3. Client không khai báo `installments`: bỏ Payment `notes = 'INSTALLMENT'` khỏi `payments[]`, `totalPaid`, `paymentCount` (chi tiết, PUT, POST, danh sách). Hôm nay chưa có dòng nào như vậy nên kết quả không đổi.
4. `GET /api/payments` (admin): `type != ORDER_PAYMENT`. Payment gói/đăng ký giữ nguyên.
5. Lưu sản phẩm từ client không gửi `pricingSchemaVersion`: option BLOCK được giữ. Nếu sản phẩm có BLOCK và payload cũ có `pricingOptions` rỗng: không đụng option, không ghi đè `rentPrice`/`salePrice` bằng 0/null (giá thật khác 0 vẫn lưu).
6. Test hợp đồng (Jest), eval case, kiểm decode Swift độc lập.

Không làm: sửa crash NaN của Android cũ (`salePrice = null`), cờ/bật tính năng, migration.
