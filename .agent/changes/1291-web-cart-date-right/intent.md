# Web: bộ chọn ngày thuê sang cột phải

Issue: #1291 · Status: draft · Created: 2026-10-28

## Problem
Trang Tạo đơn (apps/client): nút ngày thuê nằm đầu cột trái. Khi thêm món ở lưới, nhân viên phải nhìn lên đầu trang mới biết đang thuê ngày nào.

## Proposed outcome
Từ 1100px trở lên, nút ngày nằm ở cột phải, trên ô Khách hàng (owner chốt phương án B, mockup tab "Web: giỏ chọn ngày sang cột phải"). Dưới 1100px giữ nút ở đầu trang.

## Constraints
Chỉ dời một khối. Giữ DaysDialog, logic tự mở hộp chọn ngày, chữ "Giao … → Trả …". Không đổi API, mobile, i18n.

## Decision log
- 2026-10-28 — B: ngày trên Khách hàng (owner)
- 2026-10-28 — dưới 1100px giữ nút đầu trang; giữ chữ "Giao … → Trả …" (mặc định, owner có thể đổi)
