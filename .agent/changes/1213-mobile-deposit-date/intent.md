# Ngày thu cọc iOS, badge Đã thu ở danh sách, mã lỗi huỷ giữ lại

Issue: #1213 · Author: agent · Status: in-progress · Created: 2026-10-26

## Problem

E2E của #1199 thấy iOS hiện sai ngày thu (cắt chuỗi UTC), badge "Đã thu N%" không hiện ở danh sách đơn trên iOS và Android (API list không trả field), và 2 mã lỗi huỷ giữ lại chưa có trong danh mục lỗi di động.

## Proposed outcome

Ngày thu theo ngày VN trên iOS; badge ở danh sách tính từ depositAmount/totalAmount giống web; 2 mã lỗi có chữ trên iOS, Android.

## Affected users and systems

iOS, Android. Không đổi API.

## Constraints

- Không đổi API, không thêm field (không cần dòng LOG).
- iOS là chuẩn, Android theo iOS.

## Open questions

Không.

## Decision log

- 2026-10-26 — Badge dùng điều kiện của web `paidBadgePercent` (staged, RENT, RESERVED, total > 0, paid > 0). Nếu API đã trả `hasDepositPlan` + `installmentSummary` thì dùng giá trị đó.
