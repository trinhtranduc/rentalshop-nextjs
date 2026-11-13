# Plan — Nhập Excel chọn chi nhánh và số lượng theo từng chi nhánh

Issue: #1533 · Status: in-review (PR #1534) · Spec: ./spec.md

Skill: `issue-first` (xong), `api-route-standard`, `api-compat-review` (bảng ở issue và PR, dòng LOG), `i18n-keys` (`products.web.import` chỉ có ở en, vi), `verify-change`, `review-pr`. Không `mobile-parity` (điện thoại không gọi route này), không `db-migration`.

## Steps

1. Test đỏ: `tests/api/bulk-import-branches.test.ts` (spec 1-10), `tests/web-product-import-branches.test.ts` (model, spec 11-16). Thêm dòng `planned` vào `.agent/api-changes/LOG.md`.
2. API `apps/api/app/api/products/bulk-import/route.ts`:
   - zod body thêm `outletId` tuỳ chọn; đọc `outlets` mỗi dòng (số nguyên ≥ 0).
   - Hàm thuần mới `apps/api/lib/import-branch-plan.ts`: chuẩn hoá chi nhánh từng dòng theo vai trò (spec 2-5, 7), dòng tồn cho món mới (spec 6), quyết định cho món đã có (spec 8).
   - Món đã có: trong cùng transaction, upsert dòng tồn từng chi nhánh, cập nhật `totalStock` bằng tổng; đếm `byOutlet`.
3. Web:
   - `apps/client/app/products/import/import-model.ts`: kiểu chi nhánh, ô mặc định, bật/tắt, “Bật hết”, “Chép số lượng”, dòng thiếu chi nhánh, payload `outlets`, đọc `updated`/`byOutlet`.
   - `apps/client/app/products/import/page.tsx`: tải chi nhánh (`outletsApi.getOutletsByMerchant`), ô chọn / khoá, chú thích, cột chi nhánh, kết quả theo chi nhánh.
   - `packages/utils/src/api/products.ts`: `bulkImport(products, options?: { outletId })`.
   - `locales/{en,vi}/products.json`: khoá mới dưới `web.import`.
4. Verify: Jest các file trên + `product-branch-rules` + `locales-valid-json`, cả `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`; type-check client/API so với `origin/dev`; chạy thật web (Chrome có cửa sổ, chậm) với DB seed riêng.
5. PR vào `dev`: `Fixes #1533`, `Refs #1335`, bảng `## API compatibility`.

## Files

- `apps/api/app/api/products/bulk-import/route.ts`, `apps/api/lib/import-branch-plan.ts` (mới)
- `apps/client/app/products/import/{import-model.ts,page.tsx}`
- `packages/utils/src/api/products.ts`
- `locales/en/products.json`, `locales/vi/products.json`
- `tests/api/bulk-import-branches.test.ts`, `tests/web-product-import-branches.test.ts` (mới)
- `.agent/api-changes/LOG.md`
