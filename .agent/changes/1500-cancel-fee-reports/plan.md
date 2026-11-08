# Plan — Báo cáo tính phụ thu của đơn hủy

Issue: #1500 · Status: accepted · Spec: ./spec.md

1. Test trước: `top-outlets-cancel-fee.test.ts` (đỏ), e2e `cancel-fee-reports.e2e.test.js` trên API cũ (đỏ).
2. `period-report.ts`: `COUNTS_IN_REVENUE_WHERE`; `computeTopOutletsRanking` thêm một `groupBy` cho đơn hủy có phụ thu.
3. `top-customers/route.ts` và `dashboard/route.ts`: bỏ danh sách trạng thái ở điều kiện nền (nó loại `CANCELLED`), dùng `AND: [COUNTS_IN_REVENUE_WHERE]`; dashboard thêm `cancelKeptAmount` vào select.
4. `tests/api-compat`: loader nạp `COUNTS_IN_REVENUE_WHERE`; test đặc tả chuẩn hóa câu truy vấn mới về dạng cũ để các phần khác vẫn so với golden.
5. Xác minh: jest (UTC và Asia/Ho_Chi_Minh), e2e trên API local thật.

Rollback: revert PR (không migration, không dữ liệu mới).
