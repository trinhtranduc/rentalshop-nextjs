# Intent — Xuất Excel nhiều khách không còn lỗi ERR_FAILED

Issue: #1361 · Status: in-progress

## Vì sao

Chủ shop (merchant 140, production) chọn khoảng 3.000 khách ở trang Khách hàng web rồi bấm xuất Excel: trình duyệt báo `net::ERR_FAILED`, hiện "Xuất thất bại". Web gắn từng `customerIds=<id>` vào URL của `GET /api/customers/export` (`packages/utils/src/api/customers.ts` `exportCustomers`), 3.000 khách là khoảng 60 KB nên proxy / trình duyệt cắt request trước khi tới API.

## Chủ shop muốn

Chọn nhiều khách (đến 3.000 hoặc tất cả khách của shop) rồi xuất ra file Excel như bình thường, không phụ thuộc độ dài URL. Giao diện không đổi.

## Ràng buộc

- Chỉ thêm (`api-compat-review`): `GET /api/customers/export` giữ nguyên cho iOS, Android (xuất theo kỳ) và tab web cũ.
- Thêm `POST /api/customers/export` nhận mã khách trong thân JSON, cùng quyền `customers.export` (OUTLET_STAFF 403), cùng phạm vi shop / chi nhánh, cùng file Excel / CSV.
- Mã khách ngoài phạm vi người gọi bị bỏ qua như `GET` (không lộ khách shop khác).
- Giới hạn số mã mỗi lần: 5.000.
- Không chuỗi mới, không đổi giao diện, không migration.
