# Chủ shop sửa thông tin shop và chi nhánh trên điện thoại

Issue: #1313 (epic #1309) · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-29

## Problem

Màn "Thông tin cửa hàng" trên iOS và Android sửa chi nhánh của chính tài khoản. Chủ shop (MERCHANT) không có chi nhánh riêng nên bấm Sửa
là báo "Outlet ID not found" (iOS `EditStoreViewController.swift:359-368`) / `no_outlet_assigned` (Android `SettingsParity.kt:157-161`).
Gói Basic chỉ dùng điện thoại nên chủ Basic không sửa được tên, SĐT, MST, địa chỉ ở đâu cả.

## Proposed outcome (mockup đã chốt, tab "Sửa thông tin shop (phone)")

- Chủ shop: dòng "Thông tin cửa hàng" mở màn hai khối: (1) thông tin shop + nút Sửa + dòng Tiền tệ, (2) danh sách chi nhánh, bấm để sửa.
- Form shop: tên, SĐT, MST, địa chỉ (số nhà đường, phường/quận, tỉnh/thành phố), quốc gia, mã bưu chính, mô tả. Không có Website. `PUT /api/settings/merchant`.
- Form chi nhánh: tên, địa chỉ, SĐT. `PUT /api/outlets?outletId=`.
- Quản lý chi nhánh: dòng "Thông tin chi nhánh", mở thẳng form chi nhánh của mình. Nhân viên, nhân viên kho: cùng màn nhưng chỉ xem, không nút Lưu.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY. iOS, Android. Không đổi API, web, schema.

## Constraints

- iOS là chuẩn, Android giống iOS. Bám đúng mockup, không thêm UI.
- Chủ shop đơn giản: ít chữ, không thêm tính năng (thêm/tắt chi nhánh, mô tả chi nhánh, email shop để sau).
- App cũ trên store giữ hành vi cũ; không đổi API.

## Open questions

- Không còn.

## Decision log

- 2026-10-29 — chủ shop chốt mockup: hai khối cho chủ shop, quản lý chỉ chi nhánh mình, nhân viên chỉ xem, không ô Website, Tiền tệ ở khối cửa hàng.
- 2026-10-29 — địa chỉ gọi theo web: `address` = số nhà, đường; `state` = phường/quận; `city` = tỉnh/thành phố (agent, khớp `addressLine` của web).
