# Design Document: Product Pricing Options

## Overview

Chuyển mô hình giá thuê từ **1 giá / 1 pricingType mỗi sản phẩm** sang **nhiều Pricing_Option mỗi sản phẩm**, chọn ở cart. Dùng bảng quan hệ `ProductPricingOption`. Giai đoạn 1 hỗ trợ FIXED + DAILY; kiến trúc mở cho BLOCK/HOURLY.

Full-stack: DB + API + web (`packages/ui`, `packages/types`, `packages/utils`) + mobile (iOS).

## Data Model

```prisma
enum PricingType { FIXED  HOURLY  DAILY  BLOCK }   // + BLOCK (dành tương lai)
enum PricingUnit { DAY  HOUR }                      // dành BLOCK/HOURLY

model ProductPricingOption {
  id         Int         @id @default(autoincrement())
  productId  Int
  type       PricingType                 // giai đoạn 1: FIXED | DAILY
  price      Float                        // giá/lần | giá/ngày
  unit       PricingUnit?                 // null giai đoạn 1 (dùng cho BLOCK/HOURLY)
  blockSize  Int?                         // null giai đoạn 1
  isDefault  Boolean     @default(false)
  isActive   Boolean     @default(true)
  sortOrder  Int         @default(0)
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt
  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, isActive])
}

model Product {
  // ... giữ nguyên rentPrice, pricingType (backward-compat, Req 2.2)
  pricingOptions ProductPricingOption[]
}

model OrderItem {
  // ... hiện có: unitPrice, totalPrice, rentalDays
  pricingType     PricingType?   // snapshot
  pricingOptionId Int?           // tham chiếu (nullable, SetNull khi option bị xóa)
}
```

Migration: tất cả bảng/cột mới là thêm-mới hoặc nullable ⇒ không phá dữ liệu cũ.

## Backward Compatibility

- `PricingResolver.getOptions(product)`: nếu `product.pricingOptions` rỗng → tạo option ảo từ `pricingType`/`rentPrice` (FIXED nếu null) — Req 2.1.
- Khi lưu product cũ qua form mới, sinh option tương ứng, không đổi giá — Req 2.3.
- Product responses vẫn kèm `pricingType`/`rentPrice` cũ — Req 6.1.

## Pricing Logic (`packages/utils/src/core/pricing-calculator.ts`)

```
resolveSelectedOption(product, optionId?) -> PricingOption   // optionId → isDefault → fallback pricingType
calculateForOption(option, start, end, quantity):
  FIXED -> total = price * quantity
  DAILY -> days = max(1, calculateDurationInUnit(start,end,'day')); total = price*quantity*days
  (tương lai) BLOCK/HOURLY dùng unit/blockSize
```
Dùng lại `calculateDurationInUnit` (đã hỗ trợ day/hour) — Req 3.5, 7.3.

## API

- **Types** (`packages/types`): thêm interface `PricingOption` + `pricingOptions?: PricingOption[]` vào `Product`/`ProductInput`.
- **Validation** (`packages/utils/.../validation-schemas.ts`): schema `pricingOptions[]` (type ∈ {FIXED,DAILY}, price>0, đúng 1 isDefault); order item nhận `pricingOptionId?`.
- **Products route** (`apps/api/app/api/products/route.ts`, `[id]/route.ts`): POST/PUT ghi `ProductPricingOption` (upsert theo type); GET trả `pricingOptions[]`. Đảm bảo đúng 1 default.
- **Orders route** (`apps/api/app/api/orders/route.ts`): mỗi item nhận `pricingOptionId`/snapshot; tính theo option; lưu snapshot `pricingType`/`pricingOptionId` lên OrderItem.
- **DB layer** (`packages/database`): CRUD cho pricingOptions.

## Frontend — Web (`packages/ui`)

- `ProductForm.tsx`: khôi phục vùng pricing → danh sách option động (thêm/xóa), mỗi dòng: type (FIXED/DAILY), price, radio isDefault. Mở form seed 2 dòng (theo lần + theo ngày).
- `CreateOrderForm` / `RentalPeriodSelector` / `ProductsSection`: mỗi dòng cart có dropdown chọn option (mặc định = default); DAILY hiện số ngày; tính lại tổng khi đổi option/ngày; sửa `useCreateOrderForm` gửi `pricingOptionId` + `totalPrice` đúng.
- Product cards/tables: nhãn giá theo default option.

## Frontend — Mobile (iOS)

Đã có nền FIXED/DAILY (segment + cart day-stepper vừa thêm). Mở rộng:
- `Product.swift` + `ProductRequest.swift`: thêm struct `PricingOption` + `pricingOptions` (parse/gửi). Giữ `pricingType` cũ.
- `NewProductViewController`: đổi segment 2-lựa-chọn → danh sách option động (thêm/xóa dòng type+price+default).
- `CartItem.swift`/`Cart.swift`: thêm `selectedOptionId`/`selectedType`; `subTotal` theo option; `toCreateOrderRequest` gửi `pricingOptionId`.
- `ProductSelectedCell.swift`: thêm control chọn option (segmented) + giữ day-stepper cho DAILY.

## Phân rã Phase (xem tasks.md)

- **Phase 1 — Backend nền:** DB migration + types + validation + pricing logic + API products/orders + backward-compat. (Không đổi hành vi UI; API sẵn sàng.)
- **Phase 2 — Web:** ProductForm nhiều-option + order form chọn option.
- **Phase 3 — Mobile:** product form nhiều-option + cart chọn option.
- Mỗi phase có checkpoint build/test trước khi sang phase sau.

## Rủi ro / Điểm chốt

- **Giữ hay bỏ `pricingType`/`rentPrice` trên Product?** Đề xuất **giữ** (backward-compat) và đồng bộ default option → `rentPrice`/`pricingType` khi lưu, để client cũ không vỡ.
- **Đúng-1-default**: enforce ở API (nếu nhiều default → lấy cái đầu; nếu không có → option đầu).
- **Server tin giá client?** Hiện có; với nhiều-option nên cân nhắc server validate lại `totalPrice` theo option — cần chốt.
