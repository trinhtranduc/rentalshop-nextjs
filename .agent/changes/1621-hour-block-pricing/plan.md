# Plan — Giá theo khối giờ, PR 1 (API + web)

Issue: #1621 · Status: in-progress (PR 1 API + web #1622 đã merge; PR 2 iOS #1624; PR 3 Android đang làm) · Spec: ./spec.md · Branch: `feat/1621-hour-block-pricing` (từ `origin/dev`, worktree riêng)

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

## PR 2: iOS (`feat/1621-hour-blocks-ios`)

- Header: `ClientCapabilities.tokens` thêm `hour-blocks` (`Model/DepositPlan.swift`).
- Model mới `Model/HourBlocks.swift`: `HourBlock`, `HourBlocks` (khối của option, sắp theo giờ, chữ "Khối 4 giờ", "3 khối: 2 · 4 · 8 giờ", "150.000 – 400.000"), `HourBlocks.parse` (màn cài: giờ 1–24, không trùng, có giá, tối đa 10), `HourBlockSnapshot` (đọc `pricingSnapshot` HOURLY của dòng đơn), `OrderItem.hourBlockLabel` / `pricingLines` (in, ảnh chia sẻ).
- `PricingOption` đọc `unit`, `blockSize`; `PricingOptionRequest(hourBlock:)` gửi `unit HOUR` + `blockSize`, không bao giờ mặc định (`Model/Product.swift`, `Model/ProductRequest.swift`).
- Form: `ProductPriceDraft.hourBlocks` (đọc từ sản phẩm, `saveHourBlocks`, `turnOffHourBlocks`), `ProductPricing.options(..., hourBlocks:)` luôn gửi đủ khối; lỗi `hourBlocksNeedPrice` khi chỉ có khối giờ. Dòng "Theo khối giờ" dưới "Theo khối ngày" (`ProductFormViewController`), màn mới `HourBlocksViewController` ("+ Thêm khối", "Lưu bảng giá", "Tắt giá theo khối giờ").
- Form cũ `NewProductViewController`: gửi lại các khối đã lưu (không có dòng sửa khối).
- Chi tiết sản phẩm: dòng "Theo khối giờ: 2 giờ 150.000đ · …" dưới các ô giá.
- Giỏ: sheet "Cách tính giá" có một dòng cho mỗi khối, khoá `HOURLY:<option id>` (`CartPricingChoice.key`); `CartItem.hourBlockHours`, `selectHourBlock(key:)`, giữ khối khi sửa đơn (`adoptHourBlock`), khối đã bị xoá khỏi sản phẩm vẫn hiện ở dòng của nó; link dòng "Khối 4 giờ · 250.000đ"; xem trước "Khối 4 giờ × 1"; tổng = giá × SL, không nhân ngày.
- Chi tiết đơn "Khối 4 giờ · 1 × 250.000đ", phiếu in và ảnh chia sẻ "Khối 4 giờ".
- Chuỗi: 12 file `Localizable.strings` (lấy đúng câu của web), mã lỗi `HOUR_BLOCKS_INVALID`.
- Test: `POS ADBDTests/HourBlocksTests.swift` (ví dụ tiền đã chốt, payload, sheet, sửa đơn, header); UI test có cửa sổ `AnyRentE2ETests.test7sHourBlockPricing` trên simulator riêng + API máy :3197.

## PR 3: Android (`feat/1621-hour-blocks-android`)

Giống iOS (iOS là bản chuẩn):
- Header: `ClientCapabilities.TOKENS` thêm `hour-blocks` (`domain/deposit/DepositPlan.kt`).
- Logic mới `domain/products/HourBlocks.kt`: `HourBlock`, `HourBlocks` (khối của option, sắp theo giờ, khoá dòng sheet `HOURLY:<id>`, đọc `pricingSnapshot`, `parse` cho màn cài), `HourBlockText` (chữ "Khối 4 giờ", "3 khối: 2 · 4 · 8 giờ"…), `OrderItem.hourBlockLabel` / `pricingLines` (in, chia sẻ).
- Model: `PricingOption.blockSize`, `OrderItem.pricingOptionId` + `hourBlock`, `CartLine.hourOptionId` + `hourBlockHours` (`isHourBlock`, giá dòng = giá khối, không nhân ngày); đọc ở `ApiClient`, lưu nháp ở `CartStore`, nạp đơn sửa ở `CartStore.loadFromOrderDetail`.
- Form: `PriceForm` (`hourBlocks`, `saveHourBlocks`, `turnOffHourBlocks`), `ProductPricing.options(..., hourBlocks)` luôn gửi đủ khối với `unit HOUR` + `blockSize` (`ProductsV2Api`), lỗi `HourBlocksNeedPrice`; dòng "Theo khối giờ" trong `ProductFormV2Screen`, màn mới `ui/home/v2/HourBlocksScreen.kt`. Form cũ: `ApiParity.updateProductFull(..., hourBlocks)` gửi lại các khối đã lưu.
- Chi tiết sản phẩm (`ProductDetailScreen`): dòng "Theo khối giờ: …".
- Giỏ: `CartV2Logic.pricingChoices` / `currentKey` / `sheetStartPrice` / `applyPricing` theo khoá; link dòng và sheet trong `CartV2Screen`; payload `HOURLY` + `pricingOptionId` (`CartOrderSubmit.lineExtras`, `ApiClient.createOrder/updateOrder`).
- Đơn: `OrderDetailV2Screen` ("Khối 4 giờ · 1 × 250.000"), `ThermalPrinter`, `OrderReceiptShare`, ảnh chia sẻ giỏ.
- Chuỗi: 12 thư mục `values*` (câu của web), `api_error_hour_blocks_invalid` + `ApiErrorMessages`.
- Test: `domain/products/HourBlocksTest.kt`, `data/CartHourBlocksTest.kt`; e2e có cửa sổ trên AVD riêng `anyrent_norawerrors` (cổng 5570) với API máy :3197.
