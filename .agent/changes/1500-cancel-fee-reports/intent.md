# Top khách hàng, top chi nhánh và dashboard tính phụ thu của đơn hủy

Issue: #1500 · Author: Trinh Tran · Status: accepted · Created: 2026-11-08

## Problem

#1491 cho đơn thuê chưa giao hủy kèm phụ thu (`cancelKeptAmount`) và tính phụ thu vào doanh thu của đơn hủy. Đo trên API local (đơn cọc 300.000, hủy phụ thu 100.000):
Tổng quan (`period`), `income/daily`, `income`, `enhanced-dashboard`, `growth-metrics`, `today-metrics` đã ghi 100.000, nhưng ba chỗ vẫn tính đơn hủy bằng 0 vì tự loại `CANCELLED`:
`top-customers` (`totalSpent`), `top-outlets` (`totalRevenue`) và `dashboard` (`overview.totalRevenue`).

(`income/orders?status=cancelled` ghi `revenue: 0` là thiết kế: các tab new / pickup / return / cancelled là danh sách đếm đơn, `revenue: 0` ở mọi tab; doanh thu nằm ở tab `all`. Không sửa.)

## Proposed outcome

Ba báo cáo cộng thêm phụ thu của đơn hủy giữ lại, cùng số với Tổng quan: top khách hàng và top chi nhánh cộng vào khách và chi nhánh của đơn, dashboard cộng vào tổng doanh thu.
Đơn hủy không có phụ thu giữ nguyên 0. Top sản phẩm vẫn loại đơn hủy.

## Affected users and systems

`GET /api/analytics/top-customers`, `top-outlets`, `dashboard`; `packages/utils/src/analytics/period-report.ts`. Chủ shop, quản lý. App iOS và web dashboard đọc các số này.

## Constraints

Chỉ cộng thêm: không đổi tên hay kiểu field nào; số đổi chỉ với đơn hủy có phụ thu (luồng mới của #1491). Cùng định nghĩa với `calculateOrderRevenueByStatus` (phụ thu không vượt tiền cọc).

## Decision log

- 2026-11-08 — Sửa ba chỗ lệch; tab "hủy" của `income/orders` giữ `revenue: 0` (thiết kế) (Trinh Tran: "sửa giúp tôi").
