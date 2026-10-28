# Plan — Giá thuê theo khối ngày

Issue: #1189 · Status: PR 1 đang mở (phụ thuộc #1200) · Spec: ./spec.md · Nhánh từ `origin/dev`, PR vào `dev`.

Thứ tự công việc đã chốt: **#1200 hạ tầng** (header `X-Client-Capabilities`, alias `payments[]`, giữ BLOCK khi app cũ lưu sản phẩm) **→ #1189 giá theo khối ngày → #1199 thu cọc**. #1200 phải ở `main-real` trước khi bật bất kỳ thứ gì của khối ngày. Ước lượng ngày công là **thô**: PR0 ~5-7, khối ngày ~20, thu cọc ~35-40.

## Thứ tự PR (iOS là chuẩn, Android theo sau)
| # | PR | Nội dung | Ước lượng thô |
|---|---|---|---|
| — | #1200 hạ tầng (PR riêng) | header khả năng; giữ option BLOCK khi thiếu `pricingSchemaVersion`; alias payments | 5-7 ngày |
| 0 | Mockup duyệt (đã duyệt thiết kế 2026-10-25) | mc2parts.html; còn chốt "Chưa chốt" 1 | — |
| 1 | `feat(api): block-day pricing core` | failing golden test trước; `packages/utils/block-pricing.ts`; migration additive (4 cột `ProductPricingOption`, `OrderItem.pricingSnapshot`, `Merchant.settings` nếu chưa có); zod + `normalizePricingOptions`; product create/update; order POST/PUT tính lại cho client không có header + `pricingSnapshot` + guard #341 dùng tổng đã tính; phương án B theo từng tiệm (`Merchant.settings.blockPricing.oldApps`); public products (ẩn giá); khoá `blockPricing`; LOG.md; `api-compat-review` | 5-6 ngày |
| 2 | `feat(client): block-day pricing on web` | **trang chi tiết sản phẩm** (radio-row, bảng, xem thử, sao chép), dòng trung tính ở form, giỏ/tạo đơn (gửi header), phiếu in, trang shop công khai, cài đặt phương án A/B | 4 ngày |
| 3 | `feat(mobile): block-day pricing iOS` | model + `CartV2Logic` + chi tiết sản phẩm (radio-row) + giỏ + chi tiết đơn + in; unit test golden | 4 ngày |
| 4 | `feat(mobile): block-day pricing Android` | tương tự theo iOS; sửa `PricingTypes.normalize` | 4 ngày |
| 5 | `chore(i18n): block pricing strings` | gộp vào từng PR cùng key; PR riêng chỉ để rà ja/ko/zh | 0,5 ngày |
| 6 | Verify + e2e | xem mục E2E; `release-review` khi lên main-real | 2 ngày |
| 7 | Gộp bản nháp vào thư mục này | xong trong PR 1 (thay bản "Theo mốc ngày" cũ); **không mở issue mới** | 0,5 ngày |
Tổng ~20 ngày công (thô, chưa tính PR0). PR 2, 3, 4 làm song song sau PR 1 merge vào dev.

## Steps trong PR 1 (TDD)
1. Viết test golden trước (đỏ), kèm fixture JSON dùng chung (có ca VND và USD).
2. Hàm `computeBlockPrice`; xanh dưới cả hai TZ.
3. Migration (skill `db-migration`: `yarn db:migrate:dev --name product_pricing_block_tiers`, đọc SQL, `yarn db:generate && yarn type-check`).
4. Zod, normalize, product route, order route (POST và PUT, kể cả `PUT` chỉ gửi `totalAmount`); dùng skill `api-route-standard`.
5. LOG.md (status `planned`→`dev` sau merge); bảng `## API compatibility` trong PR.
6. Verify: `yarn lint`, `yarn type-check`, `cd tests && yarn test block-pricing` dưới hai TZ, `SKIP_ENV_VALIDATION=true yarn build`.

## E2E (hiển thị; phần UI chạy visible)
UI: Chrome headed bước chậm; `open -a Simulator` với thiết bị ở phía trước; Android AVD có cửa sổ (không `-no-window`). Chỉ API (Jest, `scripts/e2e/business-e2e.sh`): chạy nền, báo số. Tham chiếu hiện trạng app cũ: `e2e-old-app-baseline.md` (tạo bởi việc khác, nằm ở `../drafts-installments/`; không chờ). Dùng skill `mobile-e2e-local`.
1. Cấu hình trên **trang chi tiết** (radio "Giá theo khối ngày", 80/100/120 + 20 mỗi ngày); form chỉ có dòng trung tính.
2. Giỏ 1 / 3 / 5 ngày: 80.000 / 120.000 / 160.000.
3. Tạo đơn → **in phiếu** (công thức hiển thị đúng).
4. Build `main-real` cũ (iOS + Android) mở và tạo đơn BLOCK: tổng đúng nhờ server tính lại.
5. Lưu sản phẩm bằng app cũ: bảng BLOCK còn nguyên.
6. Phương án B cho một tiệm: app cũ bị từ chối với thông báo tiếng Việt.

## Files chính
`prisma/schema.prisma` (+migration), `packages/utils/src/core/{block-pricing,order-line-pricing,rental-days}.ts`, `packages/utils/src/core/validation-schemas.ts:167,334`, `packages/database/src/{product-pricing-normalize,product,order}.ts`, `apps/api/app/api/{products,orders,public,settings/merchant}/**`, `apps/api/lib/{public-product,mobile-app-config}.ts`, `apps/client/app/{products/[id],products/form,orders/create,orders/receipt,[tenantKey]/products}/**`, iOS `Model/{Product,CartItem,ProductsV2,Cart}.swift`, Android `data/model/Models.kt`, `domain/products/ProductRules.kt`, `ui/home/v2/{ProductFormV2Screen,CartV2Screen}.kt`.

## Risks
- Server lần đầu tính lại giá: lỗi làm sai tiền. Giải: golden dùng chung + chỉ áp cho dòng thuộc sản phẩm có option BLOCK.
- Chống trùng #341 mất tác dụng nếu guard dùng tổng client: guard dùng tổng đã tính, có test replay.
- App cũ làm mất bảng khi sửa sản phẩm (đã có cách giữ trong PR0, cần test với dữ liệu BLOCK thật).
- Làm tròn/tiền tệ: VND nguyên, USD 2 số lẻ; làm tròn một lần ở cuối.
- `MOBILE_FEATURES` trống = bật tất cả trên production (đặt tường minh khi release).
- iOS cũ hỏng cả danh sách nếu `price` option BLOCK không phải số (luôn trả số).
- Quá mốc cuối chưa chốt: cả hai chế độ phải có test; đổi mặc định sau không phá dữ liệu vì lưu theo từng option.

## Rollback
Không bật UI (khoá `blockPricing` tắt) và không tạo sản phẩm BLOCK; cột mới nullable nên giữ nguyên. Revert PR code; migration không cần revert.


## Trạng thái PR 1 và việc cho PR sau
PR 1 `feat(api): block-day pricing core` (nhánh `feat/1189-block-pricing-api`, `Refs #1189`, không `Fixes`): xem "PR 1" cuối spec.md. Kiểm: golden dưới `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`; `tests/api-compat/order-block-pricing.test.ts` (POST thật với bảng giả: iOS cũ $0, Android cũ 80.000, phương án B, client mới); `tests/api/order-put-block-pricing.test.ts`; golden `order-create-main-real.json` không đổi (tiệm không có BLOCK, app không header: cùng từng byte).
PR web cần từ API: gửi `pricingSchemaVersion: 2` + `pricingOptions[]` có `type: 'BLOCK'` kèm `blockTiers/blockStartDay/blockExtraMode/blockExtraPrice`; gửi `X-Client-Capabilities: block-pricing` ở mọi request; giá dòng = `calculateBlockRent`; đọc `orderItems[].pricingSnapshot` (`tiers, startDay, extraMode, extraPrice, days, basePrice, extraDays, extraAmount, totalPrice`) để in công thức; bắt 400 `BLOCK_PRICE_MISMATCH` (tải lại sản phẩm) và `BLOCK_TABLE_INVALID`; gửi `priceOverridden: true` khi sửa tay giá. Cần thêm ở PR web: API đọc/ghi `blockPricing.oldApps`.
