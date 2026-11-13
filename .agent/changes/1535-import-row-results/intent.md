# Kết quả nhập Excel: số liệu và từng dòng (web)

Issue: #1535 · Author: Claude (chủ shop yêu cầu 13/11) · Status: in-review · Created: 2026-11-13 · Follows: #1533

## Problem

Bước 3 "Kết quả" của `/products/import` chỉ có tổng số. Chủ shop không biết dòng nào đã vào, dòng nào trùng mã vạch (trùng với món nào), dòng nào lỗi và vì sao. `POST /api/products/bulk-import` chỉ trả số `skipped`, không trả các dòng.

## Proposed outcome

- Hàng số liệu: Tất cả dòng · Đã tạo · Thêm tồn · Trùng mã vạch · Lỗi · Không nhập; bấm ô nào thì danh sách lọc theo ô đó.
- Danh sách từng dòng của file: số dòng, tên, mã vạch, trạng thái, chi tiết (số lượng theo chi nhánh, món trùng, lý do lỗi, lý do không nhập).
- API trả thêm `rows[]` (một phần tử cho mỗi sản phẩm gửi lên).

## Users and systems

Chủ shop, quản lý, nhân viên kho trên web. `apps/api` (`bulk-import`), `apps/client` (`/products/import`), `locales/{en,vi}/products.json` (màn nhập chỉ có en, vi như #1533).

## Constraints

- Additive API: các trường cũ giữ nguyên nghĩa. Điện thoại không gọi route này.
- Không đổi luật nhập (tất cả hoặc không gì khi có dòng lỗi; món trùng như #1533).
- Giữ đơn giản: không thêm nút xuất file, không sửa lại dòng ngay trên màn kết quả.

## Decision log

- 2026-11-13 — Chủ shop: "cần hiện các dòng sản phẩm, cái nào thành công, cái nào thất bại lý do, cái nào duplicate" và "có thêm cái stats kết quả báo số lượng".
- 2026-11-13 — Dòng trùng mã vạch với dòng khác trong file (bước kiểm tra) xếp vào "Trùng mã vạch", không vào "Lỗi".
- 2026-11-13 — Dòng bỏ chọn / chưa bật chi nhánh / không nhập vì dòng khác lỗi: "Không nhập".
- 2026-11-13 — Hàng số liệu thay cho các dòng chữ "N dòng bỏ qua…", "N sản phẩm đã có được thêm tồn…"; ô theo chi nhánh (#1533) giữ nguyên.

## Open questions

Không.
