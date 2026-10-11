# Spec #830

## API
- `GET /api/products/[id]` và `GET /api/products`: với OUTLET_ADMIN / OUTLET_INVENTORY (có `outletId`), mỗi sản phẩm có thêm
  `otherOutlets: [{ outletId, outletName, stock, available, renting }]`:
  các chi nhánh **đang hoạt động** cùng merchant, trừ chi nhánh của người gọi, xếp theo id chi nhánh;
  chi nhánh chưa có dòng tồn → 0/0/0; `available = max(0, stock - renting)` (tồn trên kệ, không tính lịch đặt).
- Role khác (MERCHANT, ADMIN, OUTLET_STAFF): không có field này. Không field cũ nào đổi.
- Danh sách: một truy vấn chi nhánh đang hoạt động cho cả trang (không N+1); số tồn lấy từ `outletStock` đã tải.
- Trang kiểm tra còn hàng (`/api/products/availability`, `batch-availability`): để follow-up (logic theo lịch, không rẻ).

## Web shop
- Chi tiết sản phẩm: role chi nhánh thấy bảng "Tồn kho" chỉ chi nhánh mình; OUTLET_ADMIN / kho thấy thêm khối
  "Tồn chi nhánh khác" (chi nhánh, tồn, còn, đang thuê), chỉ đọc.
- Danh sách: ô "Còn hôm nay" thêm dòng nhỏ "Chi nhánh khác: N" (tổng còn ở chi nhánh khác) khi API gửi `otherOutlets`.
- Chuỗi trong `locales/*/products.json` (5 ngôn ngữ).

## Kiểm thử
- `tests/api/products-other-outlets.test.ts` (route list + detail, mock).
- `tests/client/…` model test cho dòng list và bảng chi tiết.
- e2e `tests/e2e/business/inventory-role.e2e.test.js`: kho thấy chi nhánh khác, staff không, merchant không.
