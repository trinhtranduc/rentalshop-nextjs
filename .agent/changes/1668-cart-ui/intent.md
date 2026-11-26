# Giỏ hàng Tạo đơn dễ nhìn, nút "Tạo đơn" không bị bóp (#1668)

Issue: #1668 · Status: accepted · Created: 2026-11-26

## Problem
Cột giỏ hàng ở màn Tạo đơn (web):
1. Nút "Tạo đơn" bị bóp còn khoảng 24px (hình viên thuốc) khi giỏ nhiều món: cột là `flex flex-col` có `max-h` và tự cuộn, nên các khối bên trong co lại thay vì cuộn.
2. Các phần trong giỏ khó phân biệt; các món chỉ cách nhau bằng đường kẻ mảnh nên dính vào nhau.

## Outcome (verifiable)
- Nút "Tạo đơn" luôn cao 52px, giỏ 1 hay 7 món.
- Tab **Cho thuê / Bán** nằm ở hàng giỏ hàng (cạnh các tab giỏ và "+ Giỏ mới"), ngay trên cột giỏ; cột giỏ lấy lại chiều cao.
- Mỗi món là một thẻ riêng (viền mảnh, nền nhạt, cách nhau 10px).
- Vùng thanh toán có nhãn "Thanh toán", nền riêng; "Tổng đơn" là số to nhất.
- Khi sửa đơn (không có hàng giỏ hàng) tab Cho thuê / Bán vẫn ở đầu cột giỏ.

## Decision log
- 2026-11-26 chủ shop chốt mockup phương án A (artifact mockup chung, tab "Giỏ hàng").
- 2026-11-26 chủ shop xem bản chạy thật: **bỏ phần thanh toán ghim ở đáy** vì làm vùng hiện món quá nhỏ; "style như trước đó": cả cột giỏ cuộn cùng nhau. Giữ các điểm còn lại.

## Constraints
- Chỉ web (`apps/client`); không đổi cách tính tiền, API, iOS, Android, schema.
- Không có nút nhanh "Thu đủ" / "Không thu cọc".
