# Gợi ý "Chi nhánh khác còn N" khi hết hàng lúc tạo đơn (API + web)

Issue: #1347 (của #1335, PR 2) · Author: Trinh Tran · Status: in-progress · Created: 2026-10-30

## Problem

Tạo đơn ở chi nhánh A, món X hết đúng ngày khách thuê: giỏ chỉ báo "Hết hàng". Chủ shop, quản lý, kho phải mở từng chi nhánh khác để biết còn không rồi báo khách. Còn hay không phụ thuộc đúng ngày của đơn, không phải tồn trên kệ hôm nay.

## Proposed outcome

Dưới dòng "Hết hàng" của dòng giỏ web hiện "Chi nhánh khác còn: Quận 7 (3), Thủ Đức (1)", tính theo ngày của đơn bằng đúng cách `POST /api/products/batch-availability` tính. Chủ shop, quản lý, kho thấy; nhân viên chỉ thấy "Hết hàng"; shop một chi nhánh không có dòng này. Chỉ là gợi ý để báo khách: một đơn một chi nhánh, không có nút lấy hàng sang.

## Affected users and systems

MERCHANT, ADMIN, OUTLET_ADMIN, OUTLET_INVENTORY (thấy); OUTLET_STAFF (không). api, client, `packages/utils`. Điện thoại là PR 2m sau.

## Constraints

Chỉ thêm một route mới; app cũ không gọi. Ngày Việt Nam (`timezone-dates`). Không đổi danh sách sản phẩm. Mockup đã chốt: artifact 9b56KwErJWiGpiyFEfyEY4, tab "Chi nhánh khác còn và nhập Excel", C1c / C1d.

## Open questions

- Không. Q9 (theo ngày của đơn) đã chốt.

## Decision log

- 2026-10-30 — Gợi ý chỉ tính chi nhánh khác đang hoạt động và đang tick (`isListed`) món đó (chủ shop).
- 2026-10-30 — Web kiểm tra vai trò ở phía giao diện chỉ để khỏi gọi thừa; quyền thật ở API (403 cho nhân viên).
