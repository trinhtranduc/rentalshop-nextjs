# Implementation Plan: Product Pricing Options

## Overview

Nhiều Pricing_Option / sản phẩm (giai đoạn 1: FIXED + DAILY), chọn ở cart. Full-stack, chia 3 phase; mỗi phase kết thúc bằng checkpoint build/test. Task `*` là test (tùy chọn).

---

## Phase 1 — Backend nền (DB + API)

- [ ] 1. DB & migration
  - [ ] 1.1 Thêm `BLOCK` vào enum `PricingType`; thêm enum `PricingUnit { DAY HOUR }` (`prisma/schema.prisma`)
    - _Req: 7.1, 7.2_
  - [ ] 1.2 Thêm model `ProductPricingOption` + relation `Product.pricingOptions`
    - _Req: 1.1, 1.2_
  - [ ] 1.3 Thêm `pricingType?`, `pricingOptionId?` vào `OrderItem`
    - _Req: 5.1_
  - [ ] 1.4 Tạo migration (mọi thứ thêm-mới/nullable → backward-compat)
    - _Req: 2.2, 6.4_

- [ ] 2. Types & constants
  - [ ] 2.1 `packages/constants/src/pricing.ts`: thêm `BLOCK` + `PricingUnit`
  - [ ] 2.2 `packages/types`: interface `PricingOption` + `pricingOptions?` trên `Product`/`ProductInput`; block snapshot trên OrderItem type
    - _Req: 6.1_

- [ ] 3. Pricing logic (`packages/utils/.../pricing-calculator.ts`)
  - [ ] 3.1 `getOptions(product)` với fallback từ `pricingType`/`rentPrice` (Req 2.1)
  - [ ] 3.2 `resolveSelectedOption(product, optionId?)` (Req 4.1, 4.2)
  - [ ] 3.3 `calculateForOption(option, start, end, qty)` — FIXED/DAILY, generic unit
    - _Req: 3.1, 3.2, 3.3, 3.5_
  - [ ]* 3.4 Unit test: FIXED, DAILY (1/3 ngày), fallback không option, mix

- [ ] 4. Validation (`packages/utils/.../validation-schemas.ts`)
  - [ ] 4.1 Schema `pricingOptions[]`: type ∈ {FIXED,DAILY}, price>0, đúng 1 isDefault; chặn BLOCK/HOURLY
    - _Req: 1.4, 1.5, 7.2_
  - [ ] 4.2 Order item nhận `pricingOptionId?` (optional, backward-compat)
    - _Req: 6.3, 6.4_

- [ ] 5. DB layer + API
  - [ ] 5.1 `packages/database`: CRUD `pricingOptions` khi tạo/sửa product; enforce 1 default; sync default → `rentPrice`/`pricingType`
    - _Req: 1.2, 1.3, 2.3_
  - [ ] 5.2 `products/route.ts` + `[id]/route.ts`: nhận & trả `pricingOptions[]`
    - _Req: 6.1, 6.2_
  - [ ] 5.3 `orders/route.ts`: tính theo option đã chọn, lưu snapshot lên OrderItem
    - _Req: 3.*, 5.1, 5.3_
  - [ ]* 5.4 Test API: tạo product 2 option; tạo order chọn từng option; client cũ vẫn chạy
    - _Req: 6.4_

- [ ] 6. **Checkpoint Phase 1** — migrate + API hoạt động, backward-compat, chưa đổi UI

---

## Phase 2 — Web (`packages/ui`)

- [ ] 7. Product form
  - [ ] 7.1 `ProductForm.tsx`: danh sách option động (thêm/xóa; type, price, radio default); seed 2 dòng (theo lần + theo ngày); submit `pricingOptions[]`
    - _Req: 1.1, 1.2_
- [ ] 8. Order form
  - [ ] 8.1 `ProductsSection`/`RentalPeriodSelector`: dropdown chọn option mỗi dòng (default = isDefault); DAILY hiện số ngày
    - _Req: 4.1, 4.2, 4.4_
  - [ ] 8.2 `useCreateOrderForm.ts`: tính total theo option (× ngày nếu DAILY), gửi `pricingOptionId` + `totalPrice`
    - _Req: 3.1, 3.2, 5.1_
  - [ ] 8.3 Product cards/tables: nhãn giá theo default option
    - _Req: 4.5_
- [ ] 9. **Checkpoint Phase 2** — web tạo product nhiều-option & order chọn option

---

## Phase 3 — Mobile (iOS)

- [ ] 10. Models
  - [ ] 10.1 `Product.swift` + `ProductRequest.swift`: struct `PricingOption` + `pricingOptions` (parse/gửi); giữ `pricingType`
    - _Req: 6.1, 6.2_
- [ ] 11. Product form
  - [ ] 11.1 `NewProductViewController`: đổi segment → danh sách option động (type + price + default)
    - _Req: 1.1, 1.2_
- [ ] 12. Cart
  - [ ] 12.1 `CartItem.swift`/`Cart.swift`: `selectedOptionId`/type; `subTotal` theo option; gửi `pricingOptionId`
    - _Req: 3.*, 4.3, 5.1_
  - [ ] 12.2 `ProductSelectedCell.swift`: control chọn option (segmented) + giữ day-stepper cho DAILY
    - _Req: 4.1, 4.3, 4.4_
- [ ] 13. **Checkpoint Phase 3** — build + test end-to-end iOS

---

## Ghi chú
- Phần iOS FIXED/DAILY đã làm (segment + day-stepper) sẽ được **nâng cấp** thành nhiều-option ở Phase 3, không bỏ đi.
- Điểm cần chốt (design.md): giữ `pricingType`/`rentPrice` trên Product (đề xuất giữ); server có validate lại giá theo option không.
