# Spec — `POST /api/customers/export`

Issue: #1361 · Status: in-progress

## API

`POST /api/customers/export`, bọc `withCustomerExportAuth` (`customers.export`), thân JSON (zod):

| Trường | Kiểu | Ghi chú |
|---|---|---|
| `customerIds` | `number[]` nguyên dương, tối đa 5.000 | tuỳ chọn; rỗng hoặc thiếu thì xuất theo kỳ |
| `format` | `'excel'` (mặc định) hoặc `'csv'` | như `GET` |
| `period` | `'1month'`, `'3months'`, `'6months'`, `'1year'`, `'custom'` | như `GET` |
| `startDate`, `endDate` | chuỗi | như `GET` (`custom`) |
| `merchantId` | số | chỉ ADMIN / OPS không có shop (như `GET`) |

- Thiếu `customerIds` (hoặc rỗng) và không có `period`, `startDate`, `endDate`: 400 `INVALID_INPUT` (khác `GET`, nơi mặc định 1 tháng).
- Quá 5.000 mã, sai kiểu, thân không phải JSON: 400 `INVALID_INPUT`.
- Khoảng ngày sai: 400 `INVALID_INPUT` với cùng thông điệp như `GET`.
- Thành công: cùng thân, đầu `Content-Type` / `Content-Disposition` / `Cache-Control` như `GET`.

## Dùng chung với GET

Logic nằm trong một hàm dùng chung `apps/api/lib/customers-export.ts` (`buildCustomersExportResponse`): đọc phạm vi `userScope`, tải khách (`db.customers.search`, `limit: 10000`, `firstName asc`), lọc theo mã (có mã thì bỏ lọc theo kỳ), dựng Excel / CSV, tên file. `GET` chỉ đọc query rồi gọi hàm này; `POST` đọc thân rồi gọi hàm này. Hành vi `GET` không đổi.

## Web

`customersApi.exportCustomers`: có `customerIds` thì `POST` (`authenticatedFetch`, thân JSON, nhận blob); không có thì `GET` theo kỳ như cũ (URL ngắn; tránh phụ thuộc thứ tự deploy web / API cho đường đã chạy tốt). Trang khách hàng giữ nguyên `exportDone`, `exportFailed`, `exportFileName(todayKey, n)`.

## Không làm

Không đổi `limit: 10000`, không phân trang / luồng, không giao diện, không mobile (không gọi `customerIds`).
