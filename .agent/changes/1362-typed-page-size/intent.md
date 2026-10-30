# Số dòng mỗi trang gõ được (1 đến 3000)

Issue: #1362 · Author: Claude (agent) · Status: in-progress · Created: 2026-10-30

## Problem

Danh sách trên web chỉ cho chọn 10 / 20 / 50 / 100 dòng mỗi trang; số khác bị ép về 10. Chủ shop muốn tự gõ số (tối đa 3000). Chủ shop cũng báo "trang sản phẩm không cho chọn nhiều để xoá" nhưng chưa nói vai trò hoặc trang nào.

## Proposed outcome

Chân bảng có nút nhanh 10/20/50/100 và một ô gõ số 1..3000; `?limit=` giữ trong URL; ngoài khoảng thì kẹp; trang vẫn đúng khi API trả ít dòng hơn. Điều tra việc 2 bằng bảng vai trò x trang, chỉ sửa khi lỗi hiển nhiên.

## Affected users and systems

Web `apps/client` (MERCHANT, OUTLET_ADMIN, OUTLET_INVENTORY, OUTLET_STAFF). Không đổi API, iOS, Android.

## Constraints

Không đổi API/quyền; đủ 5 locale; không tự đổi thiết kế nếu 3000 dòng chậm.

## Open questions

- Trang admin (`Pagination` của `packages/ui`) có làm sau không.

## Decision log

- 2026-10-30 — Ô gõ nằm chung `TableFooter`, nên mọi danh sách dùng footer này (kể cả nhân viên, đơn của sản phẩm) được áp dụng.
