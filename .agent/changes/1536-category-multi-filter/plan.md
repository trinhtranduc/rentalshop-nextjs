# Plan — #1536

Status: in-review

1. Test trước (fail):
   - `tests/api/products-category-ids.test.ts`: route truyền `categoryIds` xuống `db.products.search` (1-4); `packages/database` `searchProducts` dựng `where.categoryId = { in }` (1-3).
   - `tests/web-products-model.test.ts`: sửa assert `parseListQuery` (đổi `categoryId` → `categoryIds`), thêm 5-7; `tests/web-products-category-filter.test.ts` cho nhãn nút + lọc tên (8).
2. API / packages: `productsQuerySchema.categoryIds` (string), `parseCategoryIds` trong route, `ProductSearchFilter.categoryIds`, `searchProducts` (database) và `productsApi.searchProducts` (utils) gửi `categoryIds`. Skill `api-route-standard`, `api-compat-review`.
3. Web: `list-model.ts` (`categoryIds`), `list/CategoryFilter.tsx` (ô chọn nhiều), `page.tsx` thay hàng chip. Skill `i18n-keys` (`products.json` các ngôn ngữ đang có khóa `category`).
4. `.agent/api-changes/LOG.md`: dòng #1536.
5. Verify: test liên quan (2 múi giờ), type-check client + API, lint file sửa, build packages đổi, e2e Chrome có cửa sổ (API `:3191`, web `:3208`, DB `anyrent_1533_e2e`): chọn 2 danh mục → danh sách và tổng đúng với DB, URL `category=a,b`, bỏ 1, "Tất cả danh mục", link cũ `?category=a`, khổ 390px.
