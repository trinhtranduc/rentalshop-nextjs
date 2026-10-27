# Sheet xác nhận tạo đơn không đẩy nút ra ngoài

Issue: #1239 · Author: Trinh Tran · Status: in progress · Created: 2026-10-27

## Problem

Giỏ nhiều sản phẩm làm dòng "Món" của sheet "Tạo đơn thuê?" / "Bán & thu tiền?" dài ra, đẩy nút Hủy / Tạo đơn khỏi màn hình (iPhone SE, Android 360dp).

## Proposed outcome

Sheet hiện 1 sản phẩm (món đầu) và dòng "+N sản phẩm khác" khi có hơn 1. Nút luôn thấy. iOS là chuẩn, Android theo.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_STAFF; iOS, Android. Web đã cuộn thân, ghim nút (chỉ kiểm). Không đổi API.

## Constraints

Đơn giản: không thêm control. Chỉ đổi chuỗi hiển thị; payload tạo đơn giữ nguyên.
