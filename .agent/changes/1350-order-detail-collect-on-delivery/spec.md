# Spec — Chi tiết đơn: "Thu khi giao"

Issue: #1350 · Status: done · Intent: ./intent.md

## Behavior

Dòng "Thu khi giao" của mục thanh toán, đơn thuê RESERVED:

1. Đơn CÓ kế hoạch cọc (`hasDepositPlan` và có đợt) VÀ còn đợt tường minh chưa thu (không "rest", không VOID, `amount > 0`, `paidAmount <= 0`; đúng điều kiện API chặn giao): hiện `ShareMoneyRule.collectOnDelivery` = Tổng − Σ số tiền các đợt tường minh không VOID, không âm, làm tròn theo tiền tệ. Không cộng thế chân, không trừ `paidBefore`.
2. Mọi trường hợp khác (không kế hoạch, một lần cọc, đã thu hết các đợt tường minh, đơn không cọc): như nay, `handOver(...).due`.
3. Ví dụ: tổng 1.150.000; đợt 1 đã thu 230.000; đợt 2 345.000 chưa thu; rest 575.000 → 575.000 (nay 920.000). Thu đợt 2 → 575.000 (như nay, hai công thức bằng nhau khi không thế chân).
4. `handOver(...).due` / `collectNow`, `balance`, nút "Giao đồ · thu X", sheet giao hàng, Android `EditOrderSheet`: không đổi.

## Out of scope

Web, API, ảnh chia sẻ, chuỗi, nút/sheet giao hàng khi còn đợt chưa thu (ghi trong PR như phát hiện).
