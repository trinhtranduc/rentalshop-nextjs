# Admin sửa sản phẩm không được làm mất số đang thuê

Issue: #1339 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-30

## Problem

`PUT /api/merchants/[id]/products/[productId]` (web admin hệ thống) xoá rồi tạo lại các dòng `OutletStock` với `renting: 0`
(`apps/api/app/api/merchants/[id]/products/[productId]/route.ts:198-225`). Đây là lỗi #359 chưa vá ở route này. Sau lần lưu, hàng
đang thuê "biến mất" khỏi `renting`; khi khách trả, `renting` âm và `available > stock` (`packages/database/src/product.ts:1065-1078`).
Nguồn: báo cáo kiểm tra tồn kho R2 của #1335, spec #1336 quy tắc 29, plan #1335 "PR 0".

## Proposed outcome

Route admin dùng cùng logic như `PUT /api/products/[id]`: giữ `renting`, `available = stock - renting`, `update`/`create` theo
`productId_outletId`, không `deleteMany`, chi nhánh vắng trong payload giữ nguyên, `stock < renting` thì 400 `STOCK_BELOW_RENTED`.

## Affected users and systems

Web admin hệ thống (ADMIN/OPS sửa sản phẩm của một shop). `apps/api` + một hàm chung trong `apps/api/lib/`. Không ai khác gọi route.

## Constraints

- Không đổi hình dạng response, không đổi schema, không thêm trường.
- 404 `OUTLET_NOT_FOUND` (chi nhánh ngoài shop), 404 `PRODUCT_NOT_FOUND` (sản phẩm ngoài merchant), 403 (role chi nhánh) giữ nguyên.
- Không đụng ô tick `isListed` hay phần khác của #1335.

## Open questions

- Không.

## Decision log

- 2026-10-30 — chủ shop chốt mockup #1335; PR 0 đi đầu, độc lập (plan #1335).
- 2026-10-30 — hàm chung `apps/api/lib/outlet-stock-upsert.ts`; `products/[id]/route.ts` chưa chuyển sang dùng để tránh xung đột với PR 1 (#1335) cùng sửa đoạn đó (agent).
