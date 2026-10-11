# Intent #827 — Tổng quan: chọn nhiều chi nhánh và so sánh chi nhánh

Phần của #823. Chủ shop (MERCHANT, shop có ≥ 2 chi nhánh) muốn xem Tổng quan cho tất cả hoặc vài chi nhánh,
và so sánh các chi nhánh với nhau. Mockup đã duyệt 2026-10-11 (comment cuối của #827).

- Góc phải: nút **Chi nhánh** (chọn nhiều) và nút **Thời gian** (Hôm nay / 7 ngày qua / Tháng này / Tháng trước / Tuỳ chọn…).
- "Tất cả" = chi nhánh đang hoạt động; chi nhánh đã tắt chỉ khi tick thêm.
- Bảng **So sánh chi nhánh** dưới các thẻ khi chọn ≥ 2 chi nhánh; dòng Tổng = các thẻ.
- Nhớ lựa chọn theo trình duyệt và trên URL (`?outlets=1,3`); sidebar chỉ đổi nhãn.
- Ràng buộc: API chỉ thêm tham số/trường; user chi nhánh luôn khóa chi nhánh của mình; ngày theo giờ Việt Nam; không tính đơn hủy.
