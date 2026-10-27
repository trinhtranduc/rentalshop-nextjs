# Spec — Giá thuê theo khối ngày

Issue: #1189 · Status: thiết kế đã duyệt 2026-10-25; PR 1 = API + hàm tính chung (không UI) · Intent: ./intent.md · Mockup: scratchpad/mc2parts.html (phần 1) + `.agent/designs/day-block-pricing/`

## Quyết định đã chốt
1. **(Đã thay bằng `../1249-product-price-mode/spec.md`, chủ chốt lần cuối mockup v179 ngày 2026-10-27: form sản phẩm có BA loại giá cùng tồn tại (Theo lần / Theo mỗi ngày / Theo block ngày, bảng setup ở màn riêng), không radio, không công tắc, không danh sách 3 radio; thay thiết kế "chọn 1 trong 2" của #1258/#1260; trang chi tiết web chỉ xem.)** ~~Cấu hình trên trang CHI TIẾT sản phẩm~~ **Cấu hình trên trang CHI TIẾT sản phẩm**, không trên form sản phẩm. Form sản phẩm chỉ có một dòng trung tính "Giá thuê" (hiện tóm tắt, bấm để sang trang chi tiết). Giao diện chọn kiểu giá là **danh sách dòng radio** ("Thuê theo lần" / "Thuê theo ngày" / "Giá theo khối ngày"), không dùng công tắc hay segmented control.
2. **Dữ liệu:** cột nullable trên `ProductPricingOption` (`blockTiers` JSONB, `blockStartDay`, `blockExtraMode`, `blockExtraPrice`); `price` của option BLOCK = giá ngày 1; `OrderItem.pricingSnapshot` JSON.
3. **App cũ:** header khả năng `X-Client-Capabilities: block-pricing` (đọc bằng `apps/api/lib/client-capabilities.ts` của #1200). Client không khai báo → máy chủ **tính lại dòng BLOCK ở cả POST và PUT đơn** (phương án A, mặc định). Cài đặt từng tiệm `Merchant.settings.blockPricing.oldApps = 'recompute' | 'block'` (mặc định `recompute`; `block` = phương án B, 400 `PRICING_TYPE_REQUIRES_UPDATE`).
4. Ghi rõ ảnh hưởng chống trùng #341, việc form cũ làm mất BLOCK (được giữ nhờ `pricingSchemaVersion`), làm tròn/tiền tệ.
5. Bản nháp đã gộp vào thư mục này (thay bản "Theo mốc ngày" cũ), không mở issue mới. Thứ tự: #1200 hạ tầng → **giá theo khối ngày (#1189)** → thu cọc (#1199). Ước lượng thô: khối ngày ~20 ngày công.
6. **Nhận ra dòng BLOCK (e2e app cũ):** server không tin payload. Dòng thuộc sản phẩm có option BLOCK đang bật là dòng BLOCK khi: trỏ `pricingOptionId` tới option BLOCK; hoặc `pricingType='BLOCK'`; hoặc (không có id hợp lệ, không phải `DAILY`/`HOURLY`) option mặc định của sản phẩm là BLOCK. iOS cũ gửi FIXED giá 0 không id, Android cũ gửi FIXED giá ngày 1 `rentDays 1`: cả hai đều được nhận ra và tính lại. Dòng chọn rõ option FIXED/DAILY thì không phải BLOCK. Chỉ đơn RENT.
7. **App cũ thấy gì ở sản phẩm:** `rentPrice` = giá ngày 1 và `pricingType` của sản phẩm luôn `FIXED` (không ghi `BLOCK` ở cấp sản phẩm, vì app cũ không giải mã). Với client không có capability `block-pricing`, danh sách `pricingOptions` đổi option BLOCK thành option `FIXED` giá ngày 1 (cùng `id`, bỏ 4 trường `block*`), hoặc bỏ hẳn nếu sản phẩm đã có option FIXED thật (iOS cũ bỏ option BLOCK và cả `rentPrice` nên hiện $0). Áp dụng ở `GET /api/products`, `GET/PUT /api/products/[id]`, `POST /api/products`, `searchByImage`. Client có capability nhận option như đã lưu (type `BLOCK` + bảng).

## Chưa chốt
1. **Quá mốc cuối (CHỦ ĐÃ CHỐT, #1223):** mặc định "mỗi ngày thêm +X" (`EXTRA_PER_DAY`); "giữ giá mốc cuối" (`HOLD_LAST`) vẫn chọn được theo từng sản phẩm. X **bắt buộc** ở `EXTRA_PER_DAY` (0đ là một giá hợp lệ): web, iOS, Android chặn lưu khi thiếu X, và API trả 400 `BLOCK_TABLE_INVALID` khi lưu (`isCompleteBlockTable`, `blockOptionsIssue`). Bảng đã lưu mà thiếu X vẫn được đọc và tính X = 0 (không lỗi 500).
2. Nội dung mẫu mặc định của thu cọc theo giai đoạn (thuộc spec `../drafts-installments/spec.md`; khối ngày tạo ra tổng tiền mà các giai đoạn tính %).
3. Phải thu giai đoạn 1 mới giữ lịch? (thuộc thu cọc.)
4. Chính sách huỷ mặc định (thuộc thu cọc.)
5. Dùng lại #1189 (đề xuất, đã ghi ở "Quyết định đã chốt" nhưng chủ shop xác nhận khi gộp).
6. Các ước lượng ngày công chỉ là thô.

## Behavior (mỗi dòng test được)
1. Bảng giá: dòng `i` (i = 1..N) là giá cả đơn khi thuê đúng `i` ngày. Số ngày tự đánh số liên tục, không có "khoảng trống". Giá >= 0, N >= 1 (tối đa 31).
2. Thuê `d` ngày, `d <= N`: giá = `tiers[d-1]`.
3. `d > N` (chủ đã chốt, xem "Chưa chốt" 1): chế độ `EXTRA_PER_DAY` (mặc định): `tiers[N-1] + (d-N) * extra` (`extra` >= 0). Chế độ `HOLD_LAST`: `tiers[N-1]`. Cả hai được cài đặt và test; mỗi sản phẩm chọn một.
4. Bảng bắt đầu từ ngày `k > 1` (cho phép, cột `blockStartDay`): thuê ít hơn `k` ngày tính bằng giá mốc đầu. (Nếu chủ shop không muốn: bảng luôn bắt đầu 1 ngày và bỏ dòng này.)
5. `d` = `countRentalDays(pickup, return, tz)` (`packages/utils/src/core/rental-days.ts:32`): ngày dân sự VN tính cả hai đầu, tối thiểu 1; cùng ngày lấy và trả = 1; `16:59:59Z` và `17:00:00Z` thuộc hai ngày VN khác nhau.
6. Giá dòng = giá khối x số lượng. Giảm giá đơn áp sau tổng các dòng (như `apps/api/lib/order-discount`). Sửa tay giá dòng (override) vẫn được và không bị server tính lại khi client mới gửi `priceOverridden: true`.
7. Đổi ngày lấy/trả trong giỏ hoặc sửa đơn: giá tính lại từ bảng. Đơn đã tạo dùng bảng đã lưu trong `pricingSnapshot`, không đổi khi shop sửa bảng sau này.
8. Server (POST/PUT đơn, chỉ RENT): với dòng BLOCK (mục 6 ở "Quyết định") và client không có header `X-Client-Capabilities: block-pricing`, bỏ `unitPrice`/`totalPrice` client gửi, tính từ ngày lấy/trả (ngày dân sự theo múi giờ shop, `countRentalDays`) + bảng giá, ghi `unitPrice` = giá một đơn vị, `totalPrice` = giá x SL, `rentalDays`, `pricingType='BLOCK'`, `pricingOptionId`, `pricingSnapshot`. `totalAmount` = Σ dòng − giảm giá (giảm % tính trên tổng mới, làm tròn theo đơn vị nhỏ nhất của tiền tệ) khi server đã tính lại dòng nào; đơn không có dòng BLOCK giữ nguyên `totalAmount` của client. `PUT`: dòng đã có trong đơn dùng bảng trong `pricingSnapshot` (đổi bảng sản phẩm sau này không đổi đơn cũ), dòng mới dùng bảng hiện tại; `PUT` chỉ đổi ngày (không gửi dòng) thì ghi lại dòng đã lưu theo số ngày mới; `PUT` chỉ gửi `totalAmount`/giảm giá thì tổng = Σ dòng đã lưu − giảm giá. Client mới (có header) gửi giá, server kiểm bằng cùng hàm và trả 400 `BLOCK_PRICE_MISMATCH` nếu lệch (sai số nửa đơn vị nhỏ nhất), trừ khi dòng có `priceOverridden: true` (khi đó giữ giá của client, snapshot đánh dấu `overridden`). `pricingSnapshot` do client gửi luôn bị bỏ. Giới hạn đã biết: app cũ không có cách báo "đã sửa tay giá dòng BLOCK", nên giá sửa tay bị tính lại.
9. Sửa sản phẩm từ client không có `pricingSchemaVersion: 2` mà sản phẩm đang có option BLOCK (web cũ, admin `packages/ui` ProductForm, iOS/Android cũ; e2e: PUT `rentPrice:0, salePrice:0, pricingOptions:[]` hiện xoá option BLOCK): giữ nguyên option BLOCK và `rentPrice`. **Phần giữ option do #1200 làm**; phần của #1189: `normalizePricingOptions` chỉ nhận option BLOCK khi client gửi `pricingSchemaVersion: 2`, PUT/POST sản phẩm trả lại đủ `blockTiers/blockStartDay/blockExtraMode/blockExtraPrice` cho client có capability, và không bao giờ ghi `pricingSchemaVersion` xuống cột Product. Client v2 gửi bảng sai (rỗng, >31 dòng, giá âm, >1 option BLOCK) nhận 400 `BLOCK_TABLE_INVALID`.
10. Tạo sản phẩm mới kiểu BLOCK chỉ từ client có `pricingSchemaVersion: 2`; app cũ không có UI để tạo.
11. Trả cho client không khai báo hỗ trợ: option BLOCK được trả với `type: "BLOCK"`, `price` = giá ngày 1 (luôn là số, vì iOS cũ hỏng cả danh sách nếu `price` thiếu/null), `isActive`, `isDefault`; không đổi trường cũ. `Product.rentPrice` = giá ngày 1.
12. Phương án A (mặc định) cho app cũ: vẫn đặt thuê; giỏ app cũ hiện giá ngày 1 (nhờ option FIXED ở mục 7), đơn lưu và chi tiết đơn hiện tổng đúng do server tính (`OrderDetailViewController.swift:517`, `OrderDetailV2Screen.kt:978`). Phương án B: server từ chối với 400 `PRICING_TYPE_REQUIRES_UPDATE`, `message` tiếng Việt "Sản phẩm này dùng giá theo khối ngày. Vui lòng cập nhật ứng dụng để đặt thuê.", `error` rỗng (Android ưu tiên `error` `ApiClient.kt:1302-1325`). Chủ shop chọn A hoặc B **cho từng tiệm** trong cài đặt (`Merchant.settings.blockPricing.oldApps = 'recompute' | 'block'`, mặc định `recompute`, giá trị lạ = `recompute`; chỉ MERCHANT đổi, **API đổi cài đặt làm ở PR web**; cột `settings` JSONB nullable tạo trong PR 1 bằng `ADD COLUMN IF NOT EXISTS`, dùng chung với thu cọc). Ở phương án B, `PUT` của app cũ vẫn sửa được đơn BLOCK đã có, chỉ từ chối dòng BLOCK **mới**. A không chặn tiệm đang chạy; B an toàn về tiền nhưng chặn bán.
13. Trang shop công khai: hiện bảng "1 ngày 80.000đ, 2 ngày ..., thêm mỗi ngày +20.000đ"; `showPublicPrice=false` thì ẩn bảng và `blockTiers`, hiện "Liên hệ" (`apps/api/lib/public-product.ts:48`, `PublicProductGrid.tsx:198-235`).
14. Phiếu in/chia sẻ: dòng "Khối 3 ngày + 2 ngày thêm" và công thức "120.000 (3 ngày) + 2 x 20.000 = 160.000" (`receipt-model.ts:151 itemCalcText`, `ThermalPrinter`/`PrinterManager` cho app mới).
15. "Sao chép từ sản phẩm khác": chép bảng + quy tắc quá mốc (không chép giá bán/cọc).
16. "Tạo nhanh": ngày đầu + mỗi ngày thêm sinh bảng N dòng (xem thử trước khi lưu).
17. Quyền: sửa bảng giá cần `products.manage` (như `products/[id]/route.ts:594-612`); `OUTLET_STAFF` không sửa giá (ẩn control và API từ chối).
18. Doanh thu/báo cáo dùng `totalAmount` đã lưu; không đổi công thức; đơn CANCELLED loại như hiện nay.
19. **Chống trùng #341:** `createGuard.totalAmount` (`orders/route.ts:948`) hiện dùng số client; với dòng BLOCK server lưu số đã tính lại nên `findRecentDuplicate` (`where totalAmount = guard`) sẽ không khớp và chống trùng mất tác dụng cho đơn BLOCK từ app cũ. Guard phải dùng tổng đã tính; test replay đơn BLOCK từ client cũ trả đúng một đơn.
20. **Làm tròn và tiền tệ:** mọi giá trong bảng là số tiền theo đơn vị của tiền tệ tiệm (VND nguyên, USD tối đa 2 số lẻ); `computeBlockPrice` làm tròn kết quả theo `minorUnit(currency)` (VND 1, USD 0,01) bằng hàm dùng chung với thu cọc; `(d−N) × extra` tính chính xác rồi mới làm tròn một lần; không làm tròn từng ngày. `Merchant.currency` hiện chỉ hiển thị (mặc định `USD`), nên golden có cả ca VND và USD.
21. **(Đã thay bằng #1249 mockup v179, xem mục 1: ba loại giá cùng tồn tại trong form.)** **Giá thuê trong form cũ:** form sản phẩm (web, admin, iOS, Android) chỉ hiện dòng "Giá thuê" trung tính; kiểu khối ngày chỉ đổi được trên trang chi tiết bằng client mới. Client cũ lưu sản phẩm BLOCK không làm mất bảng (mục 9) và không thấy bảng (chỉ thấy giá ngày 1).

## Out of scope
Giá theo giờ; mẫu bảng giá dùng chung nhiều sản phẩm (làm sau, v1 chỉ "sao chép"); giá theo mùa/ngày lễ; mỗi sản phẩm nhiều bảng; hiển thị bảng ở admin web (làm sau).

## API and data
**Migration (additive, đã tạo: `20261025120000_product_pricing_block_tiers`):**
```sql
ALTER TABLE "ProductPricingOption" ADD COLUMN "blockTiers" JSONB;            -- [80000,100000,120000] giá cả đơn cho ngày startDay..startDay+N-1
ALTER TABLE "ProductPricingOption" ADD COLUMN "blockStartDay" INTEGER;       -- mặc định NULL = 1
ALTER TABLE "ProductPricingOption" ADD COLUMN "blockExtraMode" TEXT;         -- 'EXTRA_PER_DAY' | 'HOLD_LAST'
ALTER TABLE "ProductPricingOption" ADD COLUMN "blockExtraPrice" DOUBLE PRECISION;
ALTER TABLE "OrderItem" ADD COLUMN "pricingSnapshot" JSONB;                  -- bảng đã dùng + days + công thức
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "settings" JSONB;              -- chung với thu cọc: {blockPricing:{oldApps:'RECOMPUTE'|'REJECT'}}
```
Enum `PricingType.BLOCK` đã có (`schema.prisma:859`), không cần ALTER TYPE. `price` của option BLOCK = giá dòng đầu. `unit`/`blockSize` không dùng (để null). Không có NOT NULL, không khóa bảng lớn.

**Hàm chung (PR 1, đã có):** `packages/utils/src/core/block-pricing.ts`: `calculateBlockRent(tiers, startDay, extraMode, extraPrice, days, minorUnit)` (+ `calculateBlockRentDetail` trả `basePrice/extraDays/extraAmount` để in công thức, `isValidBlockTable`, `currencyMinorUnit`, `roundToMinorUnit`). Bảng bắt đầu từ ngày `k`: `tiers[i]` là giá đúng `k+i` ngày, ít hơn `k` ngày tính giá mốc đầu; quá mốc cuối theo `EXTRA_PER_DAY`/`HOLD_LAST`. Phần web/mobile còn lại (PR sau): nối vào `computeOrderLineTotal` (`order-line-pricing.ts:75`), `normalizePricingOptions` (`product-pricing-normalize.ts:9` hiện bỏ mọi loại khác FIXED/DAILY), `productPriceLines` (`public-shop.ts:31`), `itemCalcText` (`receipt-model.ts:151`). Port y hệt sang Swift (`CartV2Logic`, `ProductsV2.swift:457`) và Kotlin (`CartV2Logic`, `Models.kt:250-268`).

**Zod (PR 1: `packages/utils/src/core/validation-schemas.ts` là nơi API đọc; bản tương đương trong `packages/validation/src/product.ts`):** `pricingOptions[].type` thêm `'BLOCK'` (:167); `orderItemSchema.pricingType` thêm `'BLOCK'` (:334); option BLOCK thêm `blockTiers: z.array(z.number().min(0)).min(1).max(31)`, `blockStartDay: int 1..31 optional`, `blockExtraMode: enum`, `blockExtraPrice: number >= 0 optional`; `pricingSchemaVersion: z.literal(2).optional()` ở body sản phẩm; `priceOverridden: boolean optional` ở item. Cập nhật union cứng ở `packages/types/src/entities/order.ts:113,129,147`, `packages/database/src/order.ts:482`.

**Routes:** `POST/PUT /api/products(/[id])` (lưu/giữ option BLOCK; PR0 đã có quy tắc giữ khi thiếu `pricingSchemaVersion`); `GET/PUT /api/settings/merchant` thêm `blockPricing.oldApps` (chỉ MERCHANT); `GET /api/products*` và public products (trả thêm 4 trường BLOCK); `POST /api/orders` (`route.ts:795-909`) và `PUT /api/orders/[orderId]` (`:732-768`) gọi `computeBlockPrice`; không route mới. Auth/scope: giữ `with*Auth` hiện có, đơn của merchant khác 403 như hiện nay.

**Cờ:** header client `X-Client-Capabilities: block-pricing`; `MOBILE_FEATURES` thêm khóa `blockPricing` (`apps/api/lib/mobile-app-config.ts:10-21`) để tắt UI trên app mới nếu cần; để trống = bật (`mobile-app-config.ts:57`), nên đặt giá trị production tường minh trước release.

## Screens (map mockup)
- **Trang chi tiết sản phẩm** (web `apps/client/app/products/[id]`, iOS chi tiết sản phẩm, Android màn chi tiết sản phẩm v2): khối "Giá thuê" là **danh sách dòng radio** "Thuê theo lần" / "Thuê theo ngày" / "Giá theo khối ngày" (một dòng được chọn). Chọn "Giá theo khối ngày" mở bảng: "Số ngày | Giá" tự đánh số, "+ Thêm ngày N+1", ✕ chỉ xoá dòng cuối, danh sách radio-row "Quá mốc cuối: +X mỗi ngày / Giữ giá mốc cuối", "Xem thử N ngày", "Tạo nhanh", "Sao chép từ sản phẩm khác". Chỉ vai trò có `products.manage` thấy nút sửa; `OUTLET_STAFF` chỉ xem.
- **Form sản phẩm** (web `apps/client/app/products/form/` `form-model.ts:15 PricingMode`, `ProductFormPage.tsx:580`; iOS `ProductFormViewController.swift`; Android `ProductFormV2Screen.kt`): một dòng trung tính "Giá thuê" hiện tóm tắt (ví dụ "Từ 80.000đ, theo khối ngày") và dẫn tới trang chi tiết; form không có bảng khối ngày, không có tab. Admin `packages/ui/.../ProductForm.tsx:105`: giữ nguyên, chỉ cần không làm mất BLOCK (mục 9).
- Giỏ/đơn web `apps/client/app/orders/create/create-model.ts` (`lineTotal` :343, payload :590-620, hiện công thức), nhận ngày từ picker dạng chuỗi; gửi header khả năng.
- iOS v2: `ProductsV2.swift` (`ProductPricing.options` :139-158, `CartV2Logic.calc`), `CartItem.swift`, giỏ + chi tiết đơn + in (`PrinterManager.swift`). Chuỗi vào `en.lproj` và `vi-VN.lproj`.
- Android v2: `ProductRules.kt` (`PricingTypes.normalize` :87-90 phải giữ BLOCK; `ProductPricing.options` :128-138), `Models.kt` (`CartLine.unitPrice/lineTotal`), `CartV2Screen.kt`, `ThermalPrinter.kt`. Chuỗi vào `values/` và `values-vi/`.
- Cài đặt tiệm: dòng radio "Với app cũ: máy chủ tự tính giá khối (đề xuất) / Yêu cầu cập nhật app" (chỉ MERCHANT).
- Trang shop: `PublicProductGrid.tsx`, `PublicProductSheet.tsx`, `BookingPicker.tsx`, `public-shop.ts`.
- iOS là chuẩn; Android đổi theo iOS khi khác nhau.

## Timezone
Mọi "ngày" là `YYYY-MM-DD` VN; số ngày qua `countRentalDays`. Mobile: iOS `shopTimeZone`, Android `ZoneId.of("Asia/Ho_Chi_Minh")`. Cấm `toISOString().split`, `setHours(0,0,0,0)`, `getDate()`, `toLocaleDateString()` cho logic ngày. Golden: 16:59:59Z/17:00:00Z, cùng ngày, qua cuối tháng, một năm.

## i18n keys (en, vi, ja, ko, zh)
`products.json`: `pricingBlock`, `blockDayRow` ("{n} ngày"), `blockAddDay`, `blockExtraPerDay`, `blockHoldLast`, `blockPreview`, `blockQuickCreate`, `blockCopyFrom`, `blockBeyondLast`, `blockInvalidTable`; `orders.json`: `blockLineSummary` ("Khối {n} ngày + {m} ngày thêm"), `blockFormula`; `public.json`: `blockPriceList`, `blockExtraPerDay`; `settings.json`: `blockPricingOldApps`, `blockOldAppsRecompute`, `blockOldAppsReject`; `products.json` thêm `priceRowSummary`; `errors.json`: `BLOCK_PRICE_MISMATCH`, `PRICING_TYPE_REQUIRES_UPDATE`, `BLOCK_TABLE_INVALID` (và `errors-mobile.json` nếu app dùng). Sau khi gộp dev chạy `cd tests && npx jest locales-valid-json`.

## Test plan
- Jest golden `tests/block-pricing.test.ts` chạy `TZ=UTC yarn test block-pricing` và `TZ=Asia/Ho_Chi_Minh yarn test block-pricing`, cùng một file JSON số liệu `tests/fixtures/block-pricing-golden.json` được iOS/Android đọc lại (hoặc sao chép bảng cùng nội dung): 1,2,3,4,5,10 ngày; EXTRA vs HOLD; bảng bắt đầu từ ngày 2; cùng ngày; ranh giới 17:00Z; cuối tháng; giảm giá % và số tiền sau tổng; số lượng 2.
- API: `tests/api/orders-block-pricing.test.ts` (app cũ gửi FIXED giá ngày 1 → server lưu đúng; client mới lệch → 400; PUT đổi ngày → tính lại; PUT từ app cũ giữ snapshot); `products-block-preserve.test.ts` (payload cũ không mất BLOCK; client mới đổi được); zod; public hide-price (mở rộng `tests/api/public-product-hide-prices.test.ts`); product schema (mở rộng `tests/zero-price.test.ts`).
- Web: mở rộng `tests/order-form-line-pricing.test.ts`, `tests/web-receipt-model.test.ts`, `tests/web-public-shop.test.ts`.
- Mobile unit: Swift (`CartV2Logic` golden), Kotlin (`CartBlockPricingTest.kt` cạnh `CartPricingToggleTest.kt`); không để `PricingTypes.normalize` đổi BLOCK→FIXED (sửa test `CartNullPricingTest.kt:82` có chủ đích).
- Thêm: golden VND và USD (làm tròn), replay #341 với đơn BLOCK từ client cũ, phương án B (400, `error` rỗng), `Merchant.settings.blockPricing` chỉ MERCHANT đổi, form cũ lưu sản phẩm BLOCK không làm mất bảng.

## E2E (hiển thị cho chủ shop)
UI chạy hiển thị: Chrome headed bước chậm; `open -a Simulator` với thiết bị ở phía trước; Android AVD có cửa sổ (không `-no-window`). Chạy chỉ API (Jest, `scripts/e2e/business-e2e.sh`): chạy nền, chỉ báo số. Hiện trạng app cũ: tham chiếu `e2e-old-app-baseline.md` (sẽ nằm ở `../drafts-installments/`, do việc khác tạo, không chờ).
1. Cấu hình trên **trang chi tiết** (radio "Giá theo khối ngày", bảng 80/100/120 + 20 mỗi ngày); form sản phẩm chỉ hiện dòng trung tính.
2. Giỏ với 1 / 3 / 5 ngày: 80.000 / 120.000 / 160.000.
3. Tạo đơn, mở chi tiết, **in phiếu** (công thức "120.000 (3 ngày) + 2 x 20.000 = 160.000").
4. Dùng build `main-real` cũ (iOS và Android): mở đơn BLOCK (tổng đúng) và tạo đơn BLOCK (server tính lại; giỏ app cũ hiện giá ngày 1).
5. Lưu sản phẩm bằng app cũ: bảng BLOCK vẫn còn.
6. Bật phương án B cho một tiệm: app cũ đặt thuê bị từ chối với thông báo tiếng Việt.

## Rollout
PR0 hạ tầng (header khả năng, giữ BLOCK) lên `main-real` trước; sau đó migration dev → verify dev-api → PR từng phần (xem plan). **Checklist phát hành:** đặt `MOBILE_FEATURES` tường minh trên production (để trống = bật tất cả khoá, kể cả `blockPricing`); chủ shop quyết thời điểm; ghi `.agent/api-changes/LOG.md` mỗi PR; `release-review` kiểm tra bản cài sẵn bằng build `release-2026-10-12.2`.

## Còn mở (ngoài danh sách "Chưa chốt")
1. Bảng riêng từng sản phẩm (v1, có "Sao chép từ sản phẩm khác") đã chọn; mẫu dùng chung để sau.
2. Cho bảng bắt đầu từ ngày 2 trở đi (đề xuất: cho; bỏ mục 4 nếu không).
3. Admin web: chỉ giữ BLOCK khi lưu, không làm UI ở đợt này.

## Acceptance
- [ ] Mỗi dòng Behavior có test hoặc kiểm tra UI trong plan.md
- [ ] iOS + Android cùng golden; app main-real được e2e (tạo/mở đơn BLOCK, lưu sản phẩm giữ BLOCK)
- [ ] Cấu hình ở trang chi tiết bằng radio-row; form chỉ có dòng trung tính
- [ ] Chuỗi cho 5 locale; CANCELLED, ngày VN, quyền vai trò vẫn đúng
- [ ] Dòng LOG.md và bảng `## API compatibility` trong từng PR


## PR 1 (API + hàm tính chung): đã làm gì, chưa làm gì
Đã làm: hàm tính + golden `tests/fixtures/block-pricing-golden.json`; migration + schema; zod + `normalizePricingOptions` (BLOCK chỉ khi `pricingSchemaVersion: 2`); product create/update/GET (trả đủ trường, góc nhìn app cũ ở mục 7); order POST/PUT tính lại + `pricingSnapshot` + chống trùng #341 theo tổng đã tính; trang shop công khai trả bảng (ẩn khi tắt hiện giá); mã lỗi `BLOCK_PRICE_MISMATCH`, `PRICING_TYPE_REQUIRES_UPDATE`, `BLOCK_TABLE_INVALID` (en/vi/ja/ko/zh).
Chưa làm (PR sau): API đổi `Merchant.settings.blockPricing` (PR web), khoá `blockPricing` trong `MOBILE_FEATURES`, giữ option BLOCK khi app cũ lưu sản phẩm (#1200), toàn bộ UI web/iOS/Android, phiếu in, `errors-mobile.json` (đi cùng PR mobile vì có test khớp iOS/Android), `salePrice` luôn là số cho app cũ (lỗi Android cũ không do BLOCK).
