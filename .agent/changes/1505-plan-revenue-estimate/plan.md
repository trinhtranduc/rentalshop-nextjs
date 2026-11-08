# Plan — Ước tính doanh thu gói cũ

Issue: #1505 · Status: accepted · Spec: ./spec.md

## Steps

1. **Test đỏ trước** (commit riêng): `tests/api/admin-revenue-estimate.test.ts` — hàm thuần `buildEstimatedRevenue` cho ca A-I và spec 1-8.
2. Chuyển `parseMetadata`, `estimateAmount`, `estimateFromSubscription` từ `scripts/lib/manual-extension-backfill.ts` sang
   `packages/utils/src/core/plan-extension-estimate.ts`; script import lại và re-export (test script giữ nguyên).
3. `apps/api/lib/admin-revenue-estimate.ts`: `buildEstimatedRevenue` (thuần).
4. `apps/api/app/api/admin/revenue/monthly/route.ts`: đọc nhật ký, thanh toán gần, thanh toán chờ; gắn `estimated` vào báo cáo.
5. `apps/admin/app/dashboard/components/RevenueBlock.tsx`: dòng "Ước tính" và ghi chú theo tháng; chuỗi dùng cách i18n hiện có của khối.
6. `.agent/api-changes/LOG.md`: dòng `planned` → `dev`.
7. Xác minh: `yarn --cwd tests test admin-revenue manual-extension-backfill` (TZ=UTC và TZ=Asia/Ho_Chi_Minh), type-check api + admin, chạy API local với nhật ký gieo sẵn.

## Risks

- Dòng `PENDING` trước mốc có thể gồm chuyển khoản shop chưa trả: nằm ở dòng "Ước tính", không vào "Tiền đã nhận".
- Giá gói hiện tại khác giá lúc đó: ghi rõ là ước tính.
- Hiệu năng: chỉ đọc nhật ký trong năm đang xem và các gói liên quan (có index `createdAt`, `subscriptionId`).

## Rollback

Revert PR: khối về như cũ; không có dữ liệu nào bị ghi.
