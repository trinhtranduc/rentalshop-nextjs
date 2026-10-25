# thu giai đoạn: một lần thu một giai đoạn, app cũ không thấy dòng INSTALLMENT

Status: active · Added: 2026-10-26 · Source: #1199

## Failure

`payments/process` kiểm trùng bằng `findFirst` rồi `create`, không có ràng buộc duy nhất: hai request song song thu hai lần cùng một giai đoạn. Dòng `Payment` `INSTALLMENT` lọt vào `payments[]`/`totalPaid` của app cũ làm "Đã thu" gấp đôi.

## Detect

```bash
cd tests && yarn test api/installments-routes api/installments-lib api/order-detail-payments
```

## Pass

- Hai collect cùng giai đoạn: đúng một dòng COMPLETED (khoá hàng đơn + unique một phần `(orderId, installmentKey)`), request kia 409 `INSTALLMENT_ALREADY_PAID`; cùng `reference` lặp lại: trả dòng đầu, không ghi thêm.
- Client không khai báo `installments`: không có dòng INSTALLMENT trong `payments[]`, `totalPaid`, `paymentCount`, `loadCompletedPaymentSums`, `computeOrderBalance`; không có `depositPlan`/`installments` trong phản hồi.

## Notes

Huỷ nhầm một giai đoạn: MERCHANT gọi `void` (Payment → CANCELLED) để giải phóng slot, không xoá dòng.
