# Nhập Excel chọn chi nhánh và số lượng theo từng chi nhánh (web)

Issue: #1533 · Author: Claude (chủ shop chốt mockup) · Status: in-review (PR #1534) · Created: 2026-11-13 · Parent: #1335 (phần c, PR 4)

## Problem

Nhập sản phẩm từ Excel không hỏi chi nhánh: chủ shop nhập vào `outlets.data[0]` (`bulk-import/route.ts:318-327`), có thể không phải chi nhánh chính. Món đã có (cùng mã vạch) luôn bị bỏ qua, nên shop nhiều chi nhánh không nhập được tồn cho chi nhánh thứ hai, phải sửa tay từng món.

## Proposed outcome

- Chủ shop chọn chi nhánh nhận cột Số lượng của file (mặc định chi nhánh chính) và chỉnh từng chi nhánh trên bảng kiểm tra: ô Hiện + số lượng.
- API ghi tồn và “Hiện ở chi nhánh” (`OutletStock.isListed`) đúng từng chi nhánh; món đã có chỉ nhận tồn ở chi nhánh đang tồn 0; `totalStock` đúng tổng.
- Tab cũ, gọi không có trường mới: như hôm nay.

## Users and systems

Chủ shop (MERCHANT), quản lý (OUTLET_ADMIN), nhân viên kho (OUTLET_INVENTORY) trên web. `apps/api` (`POST /api/products/bulk-import`), `apps/client` (`/products/import`), `locales/{en,vi}/products.json`. Điện thoại không có màn này.

## Constraints

- Additive API (skill `api-compat-review`); không migration.
- Quy tắc #1341: chi nhánh tắt có dòng tồn 0 `isListed: false`; import không ẩn món đang hiện.
- Giữ đơn giản (chủ shop): không thêm cột vào file Excel.

## Decision log

- 2026-11-13 — Mỗi lần nhập chọn một chi nhánh nhận số của file; chỉnh số và ô Hiện từng chi nhánh trên màn hình; ô Hiện tắt thì không nhập số (chủ shop).
- 2026-11-13 — Mặc định chi nhánh chính; món không mã vạch luôn tạo mới (đề xuất trong mockup, chủ shop chốt mockup).
- 2026-11-13 — Món đã có: chi nhánh đã có hàng thì bỏ qua, không ghi đè (chủ shop).
- 2026-11-13 — Bật một chi nhánh khác: số lượng bắt đầu 0, không tự chép số của file (tránh nhân đôi tồn); muốn cùng số thì bấm “Chép số lượng”.
- 2026-11-13 — Giới hạn số sản phẩm của gói khi nhập: không làm trong PR này (đổi luật cho shop đang dùng, cần issue riêng).
