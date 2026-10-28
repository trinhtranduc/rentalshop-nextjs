# orders: iOS đã cài không mở được đơn có Payment

Status: active · Added: 2026-10-25 · Source: #1200

## Failure

`payments[]` của chi tiết đơn chỉ có `method` / `processedAt`. Struct iOS `Payment` (`Order.swift:971-976` trên `main-real`) bắt buộc `paymentMethod` và `paymentDate`, nên `OrderDetail` giải mã hỏng (`keyNotFound paymentMethod`) với bất kỳ đơn có Payment (notes NULL, PICKUP, INSTALLMENT). Màn hình chỉ hiện "Không thể đọc dữ liệu vì dữ liệu bị thiếu." Android cũ đọc cả hai tên nên không bị.

## Detect

```bash
cd tests && yarn test api/order-payments-shape api/order-detail-payments
```

## Pass

- Mỗi phần tử `payments[]` có `paymentMethod` (= `method`) và `paymentDate` (ISO có mili giây, `Z`), field cũ còn nguyên.
- Client không gửi `X-Client-Capabilities: installments` không thấy dòng `INSTALLMENT`, `totalPaid`, `paymentCount` không tính nó.

## Notes

Thêm field mới khi app cũ cần tên khác; không đổi tên field cũ. Khi đổi hình dạng `payments[]`, chạy lại `.agent/changes/1200-old-client-infra/ios-decode-check/payments-decode.swift` với JSON thật.
