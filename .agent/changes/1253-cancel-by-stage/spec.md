# Spec: huỷ theo giai đoạn

Issue: #1253 · Intent: ./intent.md

1. `recordPlanCancellation`: trong giao dịch, sau khoá dòng đơn, nếu `Order.cancelKeptAmount` đã có số thì bỏ qua (đã ghi). Số hoàn tính lại trong khoá: `refund = max(0, đã thu còn lại − giữ)`, giữ không vượt quá số đã thu lúc đó. Huỷ là trạng thái cuối nên `cancelKeptAmount != null` chỉ do hàm này ghi.
2. `installmentSummary(stages, total)`: giai đoạn `VOID` không tính vào `planned` và `remaining`. Chỉ đơn huỷ có giai đoạn `VOID`, nên đơn khác không đổi.
3. Web chi tiết đơn huỷ có `cancelKeptAmount > 0`: hai dòng "Tiệm giữ lại" và "Hoàn cho khách" (= đã thu − giữ), dùng khoá `cancelKept` / `cancelRefund` có sẵn.
4. Ma trận (test `tests/api/cancel-by-stage.test.ts`): 1 chưa thu; 2 thu GĐ1; 3 thu GĐ1+2; 4 trễ hạn; 5 đến hạn hôm nay; 6 sửa kế hoạch/đổi tổng; 7 đã giao đồ; 8 đổi chế độ; 9 số tiền giữ và mã lỗi; 10 vai trò; huỷ hai lần; doanh thu theo ngày thu thật.
