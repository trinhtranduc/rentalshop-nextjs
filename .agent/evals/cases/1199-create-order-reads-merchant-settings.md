# tạo đơn: chế độ thu cọc của tiệm phải đọc từ cột `settings`

Status: active · Added: 2026-10-26 · Source: #1199 (PR web)

## Failure

`db.merchants.findById` không chọn cột `Merchant.settings`. `POST /api/orders` đọc chế độ thu cọc từ hàng đó nên luôn thấy `ONE_TIME`: tiệm đã bật "Thu cọc theo giai đoạn" vẫn tạo đơn không kế hoạch. Test cũ đưa `settings` vào mock của `findById` nên không bắt được.

## Detect

```bash
cd tests && yarn test api/order-create-deposit-plan
```

## Pass

- Mock `findById` không có `settings` (như hàng thật); `prisma.merchant.findUnique` trả `settings`. Client có `installments` + tiệm `STAGED` tạo đơn có `depositPlan`.
- Client không có `installments` không thêm truy vấn nào (các test `order-create-*` giữ mock `prisma` cũ).

## Notes

Bài học #1138 lần hai. Đọc `settings` bằng `loadShop(prisma, merchantId)`, không bằng hàng của `db.merchants.findById`.
