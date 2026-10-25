# doanh thu: đơn có kế hoạch cọc phải tính theo ngày thu thật, đơn không kế hoạch giữ công thức cũ

Status: active · Added: 2026-10-26 · Source: #1199

## Failure

Cọc theo giai đoạn thu ở nhiều ngày; nếu doanh thu vẫn dồn cọc vào ngày tạo đơn hoặc ngày giao thì Tổng quan, Thu theo ngày và danh sách đơn lệch nhau. Ngược lại, nếu đổi công thức chung thì mọi shop dùng "Thu cọc 1 lần" bị lệch số so với app cũ.

## Detect

```bash
cd tests && TZ=UTC yarn jest 'deposit-plan-revenue\.test' 'deposit-plan-revenue-routes' 'order-cancel-deposit-plan' 'api-compat/'
cd tests && TZ=Asia/Ho_Chi_Minh yarn jest 'deposit-plan-revenue\.test' 'deposit-plan-revenue-routes' 'order-cancel-deposit-plan' 'api-compat/'
```

## Pass

- Đơn 12.000.000 (cọc 30% / 40% / còn lại, thế chân 2.000.000): +3.600.000 ngày tạo, +4.800.000 ngày thu lần 2, +5.600.000 ngày giao, -2.000.000 ngày trả, tổng 12.000.000.
- Đơn không kế hoạch (kể cả "Thu cọc 1 lần" có cọc sản phẩm 2.000.000): +2.000.000 / +12.000.000 / -2.000.000, golden cũ không đổi.
- Huỷ giữ 1.800.000 trên 3.600.000 đã thu: chỉ -1.800.000 vào ngày huỷ; app cũ huỷ không gửi số: hoàn hết.
- `futureIncome` của đơn có kế hoạch chỉ là giai đoạn "còn lại"; giai đoạn chưa thu nằm trong `futureInstallments`.

## Notes

Một chỗ duy nhất: `toRevenueOrderData` (thêm `plan`), `buildEventWhere` (thêm `payments.some`), `REVENUE_PLAN_SELECT` cho mọi `select` đưa vào máy tính doanh thu.
