# Plan — Admin sửa sản phẩm giữ số đang thuê

Issue: #1339 · Status: in-progress · Spec: ./spec.md

## Steps

1. Test đỏ `tests/api/merchant-product-renting.test.ts` (kho tồn giả có trạng thái; kiểm trạng thái cuối, không kiểm cách ghi). Commit riêng.
2. `apps/api/lib/outlet-stock-upsert.ts`: hàm thuần `planOutletStockUpserts(productId, existingRows, entries)` trả `upserts` hoặc `belowRented`.
3. `merchants/[id]/products/[productId]/route.ts`: bỏ `deleteMany`/`create`; kiểm shop + `renting` trước mọi lần ghi; ghi `outletStock.upsert` lồng trong `db.products.update`.
4. `.agent/api-changes/LOG.md`: một dòng, status `dev`.

## Verify

`cd tests && TZ=UTC yarn test merchant-product-renting product-branch-rules products-other-outlets product-stock` (và `TZ=Asia/Ho_Chi_Minh`);
`npx tsc --noEmit -p apps/api/tsconfig.json` (trước/sau); eslint các file sửa. Thử cục bộ trên DB riêng nếu tiện.

## Risks

- Admin từng dựa vào việc "gửi một chi nhánh thì xoá các chi nhánh khác": không còn; dòng vắng giữ nguyên (đúng hơn).
- Form admin gửi lại tồn cũ khi `stock < renting` đã sẵn có (R3): 400 cho tới khi sửa số.

## Rollback

Revert PR. Không đổi dữ liệu hay schema.
