# Gợi ý "Chi nhánh khác còn N" trong giỏ (iOS, Android)

Issue: #1353 (của #1335, PR 2m; API + web là #1347) · Author: Trinh Tran · Status: in-progress · Created: 2026-10-30

## Problem

Tạo đơn trên điện thoại ở chi nhánh A, món X hết đúng ngày khách thuê: giỏ chỉ báo "Hết hàng". Chủ shop, quản lý, kho không biết chi nhánh khác còn món đó để báo khách. Web đã có gợi ý (#1347).

## Proposed outcome

Dưới chip "Hết hàng" của dòng giỏ, một dòng nhỏ: "Chi nhánh khác còn: Quận 7 (3), Thủ Đức (1)", tính theo ngày của đơn (route `POST /api/products/other-outlets-availability`). Chủ shop, quản lý, kho (shop từ 2 chi nhánh) thấy; nhân viên chỉ thấy "Hết hàng" và app không gọi route; shop một chi nhánh (Basic) không có dòng này. Chỉ là gợi ý: một đơn một chi nhánh.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_INVENTORY (thấy); OUTLET_STAFF (không). `apps/mobile` (iOS), `apps/mobile-android`. Không đổi API.

## Constraints

Mockup đã chốt (artifact 9b56KwErJWiGpiyFEfyEY4, tab "Chi nhánh khác còn và nhập Excel", C1a / C1b / C1e). Ngày theo ngày Việt Nam. Lỗi mạng, 403, 404: không hiện gì, không báo lỗi, không chặn tạo đơn. Không làm khối "Các chi nhánh khác" ở chi tiết sản phẩm (PR 5), nhập Excel (PR 4).

## Open questions

- Không.

## Decision log

- 2026-10-30 — Vai trò chi nhánh (quản lý, kho) không đếm được số chi nhánh của shop trên điện thoại (`CurrentOutlet.outlets` rỗng): vẫn gọi, API trả `[]` cho shop một chi nhánh nên không có dòng. Chủ shop chỉ gọi khi có từ 2 chi nhánh (cùng điều kiện `BranchListing`).
- 2026-10-30 — Dòng gợi ý hiện cho dòng thiếu hàng ("Hết hàng", "Chỉ còn N") và dòng trùng lịch, giống web.
