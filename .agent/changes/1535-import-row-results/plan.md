# Plan — #1535

Status: in-progress

1. Test trước (fail):
   - `tests/api/bulk-import-branches.test.ts`: thêm `describe('rows per product (#1535)')` cho hành vi 1-9; sửa 2 assert `toEqual` của đường cũ để gồm `rows`.
   - `tests/web-product-import-results.test.ts`: `readRowResults`, `buildResultRows`, `countResults` (hành vi 10-12).
2. API: `apps/api/lib/import-row-results.ts` (`RowResults`: set, rollback, toJSON); `bulk-import/route.ts` ghi trạng thái ở bước kiểm tra, bước trùng, sau transaction, khi lỗi; `findFirst` lấy thêm `name`. Skill `api-route-standard`, `api-compat-review`.
3. Web: `apps/client/app/products/import/import-results.ts` (model thuần); `page.tsx` bước 3: hàng số liệu (lọc) + danh sách dòng; giữ ô theo chi nhánh; fallback khi không có `rows`. Skill `i18n-keys` (en, vi).
4. `.agent/api-changes/LOG.md`: dòng #1535.
5. Verify: `yarn --cwd tests test bulk-import web-product-import locales-valid-json api-compat` (TZ=UTC và Asia/Ho_Chi_Minh), type-check client + API so với `origin/dev`, lint các file sửa, e2e Chrome có cửa sổ với `~/Downloads/anyrent-import-test.xlsx` (tạo, thêm tồn, trùng, không chọn, chưa bật chi nhánh) + khổ 390px.
