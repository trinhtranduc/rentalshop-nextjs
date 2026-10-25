# giao hàng: app cũ không giao được đơn còn giai đoạn cọc chưa thu

Status: active · Added: 2026-10-26 · Source: #1199

## Failure

App iOS/Android cũ không biết giai đoạn cọc. Nếu máy chủ để `PUT`/`PATCH` status → `PICKUPED` đi qua khi còn giai đoạn chưa thu, đơn được giao mà tiền cọc còn thiếu, "Thu khi giao" của app cũ không bao giờ đòi phần đó.

## Detect

```bash
cd tests && yarn test api/installments-delivery-guard
```

## Pass

- Đơn có `depositPlan` còn giai đoạn tường minh chưa thu: 400 `INSTALLMENT_UNPAID_AT_PICKUP`, `message` tiếng Việt, `error` rỗng (Android cũ hiện `error` trước), không ghi gì.
- Giai đoạn `rest` không chặn. Đơn không có kế hoạch không bị chặn. App cũ gửi `depositAmount` khi sửa đơn có kế hoạch: bị bỏ qua, trả số đúng.

## Notes

`Order.depositAmount` là số máy chủ giữ (tổng đã thu trước giao). Mọi đường ghi phải gọi `recomputeDepositFromPayments` hoặc bỏ qua số client gửi.
