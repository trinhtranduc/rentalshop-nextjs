# Ẩn thẻ "Giá theo khối ngày với app cũ" (#1661)

Issue: #1661 · Status: accepted · Created: 2026-11-25

## Problem
Cài đặt › Cửa hàng trên web có thẻ "Giá theo khối ngày với app cũ" (hai lựa chọn: máy chủ tự tính giá, hoặc yêu cầu cập nhật app).
Chủ shop không muốn hiện thẻ này.

## Outcome (verifiable)
- Chủ shop mở Cài đặt › Cửa hàng không thấy thẻ; các thẻ khác (Thông tin, Nhận đặt online, Cho tạo đơn khi trùng lịch, link Chi nhánh) giữ nguyên.
- Component, cờ và chuỗi dịch vẫn còn trong code để bật lại bằng một dòng.

## Constraints
- **Ẩn, không xoá** (chủ shop: "tôi nói ẩn đi mà").
- Không đổi API, iOS, Android. Shop chưa chọn gì ở mặc định `recompute`.

## Open question
Shop đã chọn "Yêu cầu cập nhật app" (`block`) vẫn bị áp dụng và không còn chỗ đổi. Có ép máy chủ luôn tự tính giá không? Đổi quy tắc, issue riêng, chủ shop quyết.
