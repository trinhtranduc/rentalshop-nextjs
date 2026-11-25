# Plan #1643

Status: in-progress. Skills: `api-compat-review`, `db-migration`, `i18n-keys`, `api-route-standard`.

1. `prisma/schema.prisma`: `links Json?` trên `Outlet`. SQL ở scratchpad (`ALTER TABLE "Outlet" ADD COLUMN "links" JSONB;`), owner đặt vào `prisma/migrations/`. Local e2e: `prisma db push` vào DB riêng `anyrent_1643_e2e`.
2. `packages/utils/src/core/outlet-links.ts`: loại, giới hạn, `normalizeOutletLink`, `parseOutletLinks` (đọc cột an toàn), luật chung cho API và web. Export từ `core/index.ts`.
3. `packages/utils/src/core/validation-schemas.ts`: `links` tùy chọn trong `outletCreateSchema` / `outletUpdateSchema`.
4. `packages/types/src/entities/outlet.ts`: kiểu `OutletLink`, `links` trong `Outlet` và input.
5. API: create / update chỉ ghi `links` khi có (không đụng route khác); `public/[tenantKey]/products` thêm `links`, `isDefault`.
6. Web quản lý: `apps/client/app/outlets/{outlets-model.ts,parts.tsx}` nhóm "Liên kết" (cả Thêm và Sửa); `locales/*/outlets.json` ×12.
7. Trang shop: `products/lib/outlet-picker.ts` (chọn chi nhánh, Zalo dự phòng, icon theo loại), `MerchantHeader.tsx` (chip, hàng link), `page.tsx` (đọc `?outlet=`); `locales/*/products.json` ×12.
8. Tests `tests/outlet-links.test.ts`, `tests/api/outlet-links-api.test.ts`, `tests/public-outlet-picker.test.ts` (TZ không liên quan, không có ngày).
9. `.agent/api-changes/LOG.md` thêm dòng #1643 `planned`.
10. Verify: tsc client/api (so baseline 149 / 94), jest, e2e thật trên web local (headed Chrome): nhập link ở form, mở trang shop 2 chi nhánh, chọn chi nhánh, Zalo dự phòng; kiểm tra 400px và dark.
