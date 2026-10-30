# Spec: bộ lọc "Ngày giao"

Issue: #1369 · Status: in-progress

## Behaviors

1. URL `pickup` nhận `today|tomorrow|next7d|7d|30d|month|custom`; giá trị lạ hoặc thiếu = Mọi ngày. `custom` dùng `from`/`to` (`YYYY-MM-DD`, đảo ngược thì hoán đổi), giống "Ngày tạo".
2. Khoảng ngày theo ngày Việt Nam: `today` = [hôm nay, hôm nay], `tomorrow` = ngày mai, `next7d` = hôm nay..hôm nay+6, `7d`/`30d`/`month` như "Ngày tạo".
3. Loại trừ: URL chỉ có thể mang một bộ lọc ngày. Chọn Ngày giao xoá `created`, chọn Ngày tạo xoá `pickup`; chọn "Mọi ngày" xoá `from`/`to`. Có cả hai trong URL tay thì `pickup` thắng.
4. Tham số API: Ngày giao -> `dateField=pickupPlanAt` + `startDate`/`endDate`; Ngày tạo -> không gửi `dateField` (đúng như cũ); Mọi ngày -> không gửi gì.
5. Số đếm chip (`limit=1` mỗi trạng thái), danh sách, phân trang dùng cùng bộ lọc; xuất Excel dùng `dateField` tương ứng.
6. API: `dateField=pickupPlanAt` loại đơn có `pickupPlanAt` null (đơn bán / nháp) và dùng ngày Việt Nam: đơn lấy 23:59 và 00:01 giờ VN rơi vào đúng ngày.
7. Chuỗi mới có ở en/vi/ja/ko/zh.

## Out of scope

Ngày trả, mobile, đổi API, ba bộ lọc ngày cùng lúc.

## Open questions

- Không.
