# Spec — #1219

1. `POST …/installments/[key]/collect` ghi thêm `plannedAmount` (mức giai đoạn lúc thu) vào `Payment.metadata` (JSON string đã có `kind`, `source`, `collectedOn`).
2. `effectivePlan`: giai đoạn đã khoá so số đã thu với `plannedAmount` lúc thu (nếu có), không với mức tính theo tổng hiện tại.
   - Thu đủ mức lúc thu, sau đó tổng đổi (tăng hay giảm) → `PAID`.
   - Thu ít hơn mức lúc thu → `PARTIAL` (spec #1199 mục 6, test vàng giữ nguyên).
   - Dòng cũ không có `plannedAmount` (thu trước fix) → như hiện nay (so với mức hiện tại).
   - Chưa thu → không đổi (`DUE_TODAY` / `UPCOMING` / `OVERDUE` / `VOID`).
3. Không đổi `amount`, `remaining`, `plannedAmount`, `rest`, hay bất kỳ field nào đang có. Web / iOS / Android chỉ hiển thị `status`.
4. Ca revert: `planBaseTotal` chỉ dùng `pickupTotalAmount` khi có `pickedUpAt`; revert đặt `pickedUpAt = null` nên đơn RESERVED sau revert đo theo tổng mới. Giữ nguyên, thêm test.
