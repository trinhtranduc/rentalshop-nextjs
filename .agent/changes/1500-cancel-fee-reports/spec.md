# Spec — Báo cáo tính phụ thu của đơn hủy

Issue: #1500 · Status: accepted · Intent: ./intent.md

## Behavior

1. Một đơn hủy có `cancelKeptAmount > 0` được tính trong `top-customers`, `top-outlets` và `dashboard`; đơn hủy không có phụ thu vẫn không được tính.
2. Ví dụ: đơn 50.000.000, cọc 50.000.000, hủy với phụ thu 20.000.000: doanh thu của đơn từ 50.000.000 còn 20.000.000 ở cả ba báo cáo (top khách hàng của khách đó 20.000.000; tổng top chi nhánh và dashboard giảm 30.000.000 sau khi hủy).
3. `top-customers` dùng các sự kiện doanh thu của đơn trong khoảng ngày: cọc ngày tạo, hoàn `−(cọc − phụ thu)` ngày hủy.
4. `top-outlets` cộng `cancelKeptAmount` của các đơn hủy có phụ thu, tạo trong khoảng, vào chi nhánh và vào số đơn của chi nhánh đó.
5. `dashboard` cộng `calculateOrderRevenueByStatus` của đơn hủy có phụ thu (đúng phụ thu).
6. Đơn hủy không phụ thu, `top-products` và danh sách đếm của `income/orders` không đổi.

## Out of scope

Tab new / pickup / return / cancelled của `income/orders` (`revenue: 0` là thiết kế); `top-products`; quy tắc phụ thu của #1491.

## API and data

Cùng route, cùng field, chỉ giá trị đổi cho đơn hủy có phụ thu. `COUNTS_IN_REVENUE_WHERE` (`period-report.ts`) là điều kiện chung. Không migration.

## Acceptance

- [x] `tests/packages/utils/top-outlets-cancel-fee.test.ts`; `tests/api-compat` (chuẩn hóa có ghi chú); e2e `tests/e2e/business/cancel-fee-reports.e2e.test.js`
- [x] Dòng `planned` trong `.agent/api-changes/LOG.md`; bảng `## API compatibility` trong PR
