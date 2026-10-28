# Plan — Biến thể sản phẩm

Issue: #1305 · Status: draft · Spec: ./spec.md · Nhánh code: từ `origin/dev` (`feat/<issue-con>-<slug>`), PR vào `dev`.

Không bắt đầu code trước khi (1) chủ shop trả lời "Cần chủ shop chốt" ở cuối `spec.md` và (2) duyệt mockup M1-M10. Ước lượng ngày công là **thô**.

## Thứ tự PR (iOS là chuẩn, Android theo sau)

| # | PR | Nội dung | Ước lượng thô |
|---|---|---|---|
| 0 | Mockup M1-M10 | thêm tab vào artifact mockup duy nhất, kiểm bằng Chrome thật; chủ chốt | 2 |
| 1 | `feat(api): product variants core` | test đỏ trước (golden); migration `product_variants`; token `variants`; `productForClient`/`orderItemForClient`; sản phẩm CRUD kèm biến thể; đơn (tạo / sửa / trạng thái); tồn; còn trống; chặn trùng lịch; tìm kiếm SKU; công khai (allowlist); mã lỗi; LOG.md; bảng `## API compatibility` | 7-8 |
| 2 | `feat(client): product variants on web` | form sản phẩm, chi tiết, chọn biến thể ở tạo đơn và giỏ nhiều tab, chi tiết đơn, phiếu in, kiểm tra còn trống, trang công khai | 6 |
| 3 | `feat(mobile): product variants iOS` | Codable optional; form; chọn biến thể; giỏ; chi tiết đơn; in; Lịch trống; Kiểm tra còn trống; header `variants` | 6 |
| 4 | `feat(mobile): product variants Android` | theo iOS; ghi khác biệt nếu có | 6 |
| 5 | Verify + e2e | `mobile-e2e-local` với app cũ build từ `release-2026-10-12.2`; `release-review` khi lên `main-real` | 3-4 |

PR 2, 3, 4 làm song song sau PR 1 vào `dev`. Gộp chỉnh UI nhỏ của mobile vào một PR nhiều commit. Khi PR 1 mở thêm issue con (`feat(api): …`) liên kết #1305; PR code dùng `Fixes #<issue-con>`, chỉ PR cuối dùng `Fixes #1305`.

## Steps trong PR 1 (TDD)

1. Viết test đỏ: golden tạo đơn app cũ cho sản phẩm không biến thể; sản phẩm có biến thể không token; có token thiếu `variantId`; sửa đơn từ client cũ giữ biến thể; PUT sản phẩm stock đổi / bằng; bất biến tồn; còn trống theo biến thể (`TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`).
2. Migration (skill `db-migration`): `yarn db:migrate:dev --name product_variants`, đọc SQL, `yarn db:generate && yarn type-check`. Không sửa migration đã áp dụng.
3. `packages/database/src/product-variant.ts` (mới) + sửa `product.ts` (`updateOutletStockForOrder`, `adjustOutletStockForEditedOrderItems`, `searchProducts`) và `order.ts`.
4. `client-capabilities.ts` thêm token; `block-pricing-legacy.ts` cạnh đó hoặc file mới `variants-legacy.ts` với `productForClient`/`orderItemForClient`.
5. Routes theo `api-route-standard`: `with*Auth`, zod, `ResponseBuilder`, `handleApiError`, `db` từ `@rentalshop/database`; không `new PrismaClient()`.
6. i18n (`i18n-keys`): 6 mã lỗi vào `locales/{en,vi,ja,ko,zh}/errors.json`; `cd tests && npx jest locales-valid-json`.
7. LOG.md (dòng dưới), bảng `## API compatibility` trong PR (`api-compat-review`).
8. Verify: `yarn lint`, `yarn type-check`, `cd tests && yarn test`, `TZ=UTC yarn test <file>` và `TZ=Asia/Ho_Chi_Minh yarn test <file>`, `SKIP_ENV_VALIDATION=true yarn build`.

## Files (dự kiến)

- `prisma/schema.prisma`, `prisma/migrations/<ts>_product_variants/` — bảng và cột mới
- `packages/database/src/product.ts`, `order.ts`, `product-variant.ts` (mới), `index.ts` — tồn, đơn, tìm kiếm, CRUD biến thể
- `packages/utils/src/core/validation-schemas.ts`, `packages/validation/` — `variantId`, `variants`
- `apps/api/lib/client-capabilities.ts`, `block-pricing-legacy.ts` (mẫu), `availability.ts`, `schedule-conflict.ts`, `schedule-conflict-check.ts`, `booking-requests.ts`, `public-product.ts`
- `apps/api/app/api/products/**`, `orders/**`, `calendar/orders/**`, `customers/[id]/orders/route.ts`, `public/[tenantKey]/products/route.ts`
- `locales/*/errors.json`
- `tests/api-compat/*` (golden mới), `tests/*variant*.test.ts`
- `packages/ui/src/components/forms/ProductForm.tsx`, `.../Orders/components/ReceiptPreviewModal.tsx`, `apps/client/app/products/**`, `apps/client/app/orders/create/**`, `apps/client/app/[tenantKey]/products/**`
- iOS `apps/mobile/POS ADBD/Model/{Product,Order,CartItem,Cart}.swift`, `Library/Managers/PrinterCommand.swift`, `Viewcontrollers/Products/v2/*`
- Android `data/model/Models.kt`, `data/ApiClient.kt`, `data/CartStore.kt`, `print/ThermalPrinter.kt`, `ui/home/ProductFormScreen.kt`, `ui/home/v2/ProductDetailScreen.kt`, `ui/availability/*`

## Dòng dự kiến cho `.agent/api-changes/LOG.md`

Chưa thêm vào LOG vì chưa có thay đổi API thật. Thêm trong commit đầu của nhánh code PR 1 (status `planned`), đổi `dev` sau khi gộp:

```
| 2026-10-28 | #1305 | `GET /api/products`, `/api/products/[id]`, `POST/PUT /api/products`, `POST/PUT /api/orders`, dòng đơn trong các route đơn, availability (4 route), `GET /api/public/[tenantKey]/products`, `prisma/schema.prisma` | Thêm biến thể sản phẩm: `variants[]`/`hasVariants` chỉ khi header `X-Client-Capabilities: variants`; `variantId` tuỳ chọn trên dòng đơn và availability; thêm `variantId/variantName/variantSku` trên dòng đơn; client không token nhận `productName` = `tên (biến thể)` chỉ trong response; sửa đơn từ client cũ giữ biến thể; PUT sản phẩm có biến thể đổi tồn từ client cũ → 400 `PRODUCT_STOCK_MANAGED_BY_VARIANTS`; 2 bảng mới + 3 cột nullable | Không đổi: không gửi header; `Order.swift:782-822` bỏ qua key lạ, `productName` vẫn không rỗng | Không đổi: `data/ApiClient.kt:1638`, `data/model/Models.kt:130-141` | Không đổi: tab cũ không gửi `variantId` | trung bình: app cũ không chọn được biến thể; thấp: còn lại | planned | |
```

## Risks

- Migration: additive; `OrderItem` thêm cột nullable và chỉ mục, kiểm kích thước bảng trước khi gộp vào `dev`.
- App cũ không chọn được biến thể (spec mục 13.1); cần e2e app cũ trước khi gộp.
- Bất biến tồn (spec mục 4.4) là chỗ dễ lệch; test bất biến sau mọi thao tác.
- Cả hai app mobile phải xong trước khi báo "đủ" cho chủ shop; app cũ dùng được trong lúc chờ.
- Chủ shop có thể đổi câu 1, 2, 3: mỗi câu có đường lui trong spec (giai đoạn 2).

## Rollback

Tắt tính năng ở phía client bằng cách không gửi token `variants` và không hiện mục Biến thể (bản mới của web / mobile). Code API thêm vào chỉ chạy khi có `variants` trong dữ liệu hoặc token. Bảng và cột mới giữ lại (trống, vô hại); không `DROP`. Nếu phải gỡ hẳn: revert PR code, để migration nguyên.
