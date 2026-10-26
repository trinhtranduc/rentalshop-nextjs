# Spec

- `GET /api/orders` với header `X-Client-Capabilities: installments`: mỗi đơn có `hasDepositPlan` (boolean). Đơn có kế hoạch thêm `installmentSummary: { collected, percentCollected }` (tên như chi tiết đơn). Cột `depositPlan` thô không trả ra.
- `percentCollected` = tổng Payment COMPLETED notes=INSTALLMENT / totalAmount, làm tròn 2 số lẻ (như `installmentSummary` ở chi tiết).
- Không có header: phản hồi y như trước.
- Web/iOS/Android: badge khi `hasDepositPlan === true` và đơn RENT RESERVED; % lấy từ `installmentSummary.percentCollected`. Không còn suy từ depositAmount.
- Mobile: bỏ request đọc chế độ cọc ở màn danh sách nếu chỉ phục vụ badge.
