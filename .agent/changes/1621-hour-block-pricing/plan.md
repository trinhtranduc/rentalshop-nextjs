# Plan — Giá theo khối giờ, PR 1 (API + web)

Issue: #1621 · Status: accepted · Spec: ./spec.md · Branch: `feat/1621-hour-block-pricing` (từ `origin/dev`, worktree riêng)

Skills: `api-route-standard`, `api-compat-review`, `i18n-keys`, `timezone-dates` (chỉ để chắc không đổi ngày), `mobile-parity` (ghi PR 2/3), `verify-change`.

## Steps

1. **Hàm chung** `packages/utils/src/core/hour-blocks.ts` (export ở `core/index.ts`):
   `hourBlockOf(option)` → `{ hours, price } | null` (HOURLY + `blockSize` int 1–24); `hourBlocksIssue(options)` → mã lỗi hoặc null (spec 2–4); `hourBlockSnapshotOf(snapshot)`; `sortHourBlocks`. Test `tests/hour-blocks.test.ts` (bảng ví dụ tiền qua `computeOrderLineTotal`: 150.000 / 250.000 / 160.000 / 330.000 / đơn 3 ngày 250.000).
2. **Lưu option** `packages/database/src/product-pricing-normalize.ts`: `normalizePricingOptions(opts, { allowBlock, allowHourly })` giữ HOURLY khi `allowHourly` (isDefault false, `unit: 'HOUR'`, sort sau option khác); `pricingOptionsDeleteWhere(productId, { keepBlockOptions, keepHourlyOptions })` loại `HOURLY` khỏi xoá khi client không biết. `packages/database/src/product.ts` create/update nhận `keepHourlyOptions` / `allowHourly`; mặc định lấy từ dòng không phải HOURLY. Test mở rộng file test normalize hiện có (spec 1–6).
3. **Route sản phẩm** `apps/api/app/api/products/route.ts`, `[id]/route.ts`: `hasCapability(request, 'hour-blocks')` → `allowHourly`; không có → `keepHourlyOptions`; `hourBlocksIssue` → 400 `HOUR_BLOCKS_INVALID`. Zod `validation-schemas.ts` (+ bản `packages/validation`) nhận HOURLY/`blockSize`/`unit`. Lọc trả về ở `apps/api/lib/block-pricing-legacy.ts` `pricingOptionsForClient` (bỏ HOURLY khi thiếu `hour-blocks`), dùng ở products, products/[id], searchByImage. `client-capabilities.ts` thêm token. Test API (spec 5, 7, 8; app cũ PUT version 2 không mất HOURLY).
4. **Đơn** `apps/api/lib/order-hour-blocks.ts`: `stampHourBlockLine(item, product, existing?)` (spec 10–13). Gọi ở `POST /api/orders` (vòng dòng cạnh BLOCK, `orders/route.ts` ~835–910) và trong `repriceOrderEdit` nhánh không phải BLOCK (`order-block-pricing.ts` ~243) cho PUT. Test: POST ghi snapshot; client gửi snapshot giả bị bỏ; PUT Android cũ không `pricingOptionId` giữ snapshot; đổi sang FIXED bỏ snapshot; tổng không nhân ngày.
5. **Web**:
   - `packages/utils/src/core/client-capabilities.ts`: thêm `hour-blocks`.
   - Form: `apps/client/app/products/form/form-model.ts` (state `hourBlocks`, `buildPricingOptions` thêm dòng HOURLY, đọc lại khi sửa), `ProductFormPage.tsx` (dòng "Theo khối giờ"), hộp mới `apps/client/app/products/HourBlocksDialog.tsx`.
   - Chi tiết sản phẩm `apps/client/app/products/[id]/page.tsx` (khối giá chỉ xem).
   - Giỏ: `apps/client/app/orders/create/create-model.ts` (lựa chọn theo id option, payload `pricingOptionId`), `parts.tsx` (nhãn "Khối n giờ").
   - Chi tiết đơn / phiếu in / chia sẻ: `apps/client/app/orders/receipt/receipt-model.ts` `itemCalcText` + nơi hiện dòng đơn web.
   - `apps/client/app/products/list/list-model.ts`: bỏ HOURLY có `blockSize` khỏi giá "/giờ".
   - Test mở rộng `tests/order-form-line-pricing.test.ts`, `tests/web-receipt-model.test.ts`, test form-model nếu có.
6. **i18n** 5 locale (`products.json`, `orders.json`, `errors.json`); `cd tests && npx jest locales-valid-json`.
7. **Compat**: dòng `.agent/api-changes/LOG.md` (planned → dev); bảng `## API compatibility` trong PR so với `origin/main-real`.

## Verify
- `yarn --cwd tests test hour-blocks` + các file test sửa, `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`; toàn bộ `yarn --cwd tests test` so với dev.
- `yarn lint`, `yarn type-check`, build API và client (`SKIP_ENV_VALIDATION=true`).
- E2E web **có cửa sổ** (Chrome headed, bước chậm) trên API + DB riêng ở máy (không Railway; client không dùng cổng 3000): cài khối giờ cho Váy, tạo đơn Váy khối 4 giờ + Vest khối 2 giờ = 330.000, đơn 3 ngày khối 4 giờ = 250.000, mở chi tiết đơn + phiếu in thấy "Khối 4 giờ"; sửa sản phẩm bằng request kiểu app cũ (version 2, không capability) → khối giờ còn; GET không capability → không thấy HOURLY.

## PR 2 / PR 3 (sau)
iOS rồi Android: gửi `hour-blocks`, form "Theo khối giờ", lựa chọn trong sheet "Cách tính giá" theo id, nhãn dòng đơn/in. Khi đã gửi `hour-blocks` thì mọi lần lưu sản phẩm phải gửi đủ các dòng HOURLY.
