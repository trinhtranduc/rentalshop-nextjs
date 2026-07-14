# Implementation Plan: Hourly/Daily Rental Pricing

## Overview

Implement FIXED/DAILY pricing support across the stack: API validation schema update (lightweight), iOS model + UI changes (primary), and web form updates (optional/lower priority). The DB schema already has `pricingType`, `durationConfig`, `rentalDuration`, `rentalDurationUnit` fields — no migration needed. API already returns `pricingType` in product responses and calculates `rentalDays` per item.

## Tasks

- [ ] 1. API — Add rentalDuration fields to order create schema
  - [ ] 1.1 Add `rentalDuration` and `rentalDurationUnit` to `orderCreateSchema` in `packages/utils/src/core/validation-schemas.ts`
    - Add `rentalDuration: z.number().int().min(1).optional()` to `baseOrderSchema`
    - Add `rentalDurationUnit: z.enum(["day"]).optional()` to `baseOrderSchema`
    - Add `rentDays: z.number().int().min(1).optional()` to `orderItemSchema` (already exists, confirm)
    - Ensure backward compatible: all new fields are optional
    - _Requirements: 6.2, 6.3_

  - [ ] 1.2 Update `POST /api/orders` route to use client-sent `rentalDuration` when provided
    - In `apps/api/app/api/orders/route.ts`, check if `parsed.data.rentalDuration` is provided
    - If provided, use it directly instead of server-calculated value (trust frontend — Req 6.4)
    - If not provided and product is DAILY, default to 1 (backward compat — Req 6.3)
    - Store `rentalDurationUnit` from request (default "day" for DAILY products)
    - _Requirements: 6.2, 6.3, 6.4, 5.1, 5.2_

  - [ ]* 1.3 Write unit tests for API order creation with rental duration
    - Test: DAILY product without duration → defaults to 1
    - Test: DAILY product with duration=3 → stored as 3
    - Test: FIXED product → rentalDuration ignored/null
    - Test: mixed FIXED+DAILY items calculated independently
    - _Requirements: 6.3, 5.4_

- [ ] 2. iOS — Update Product model to parse `pricingType`
  - [ ] 2.1 Add `pricingType` field to `Product.swift` model
    - Add `var pricingType: String?` property (values: nil/FIXED/DAILY)
    - Add `pricingType` to `CodingKeys` enum
    - Decode in `init(from decoder:)` using `decodeIfPresent`
    - Encode in `encode(to:)` using `encodeIfPresent`
    - Add to `init(original:)` for Copying protocol
    - Add computed `var isDailyPricing: Bool { return pricingType == "DAILY" }`
    - _Requirements: 1.1, 1.2, 1.3, 6.1_

- [ ] 3. iOS — Add rental duration to CartItem and Cart
  - [ ] 3.1 Add `rentalDays` field to `CartItem.swift`
    - Add `var rentalDays: Int = 1` to CartItem struct
    - Update primary `init(...)` to accept `rentalDays` parameter (default 1)
    - Update `init(from product:...)` to set `rentalDays = 1`
    - Update `subTotal` computed property: if product is DAILY → `Double(quantity) * price * Double(rentalDays)`, else `Double(quantity) * price`
    - Add `var pricingType: String?` to CartItem to know which calculation to use
    - _Requirements: 2.1, 2.2, 5.3_

  - [ ] 3.2 Add duration management to `CartStore.swift` and `Cart.swift`
    - Add `func updateRentalDays(at index: Int, days: Int)` to Cart class
    - Add matching method in CartStore that calls cart method + notifyDidChange
    - Update `Cart.calculateRentalDays()` to return rental days from pickup/return dates
    - When pickup/return dates change, auto-update rentalDays for DAILY items (Req 3.4)
    - Update `Cart.toCreateOrderRequest()` to include `rentalDuration` and `rentalDurationUnit` in request body
    - Update `CreateOrderRequest` struct to add `rentalDuration: Int?` and `rentalDurationUnit: String?`
    - Update `CreateOrderItem` to include `rentDays: Int?`
    - _Requirements: 2.3, 2.4, 3.4, 5.1, 5.2, 5.3_

- [ ] 4. Checkpoint
  - Ensure all changes compile correctly, ask the user if questions arise.

- [ ] 5. iOS — UI: Product card pricing label
  - [ ] 5.1 Update `ProductCell.swift` to show "/ngày" suffix for DAILY products
    - In `Views/ProductCell.swift`, check product's `pricingType`
    - If DAILY: display rent price with "/ngày" suffix (e.g. "50,000đ/ngày")
    - If FIXED or nil: display rent price as-is (no suffix, or "/lần")
    - Use existing price label, just append suffix text
    - _Requirements: 4.1, 4.2_

- [ ] 6. iOS — UI: Duration input in order creation flow
  - [ ] 6.1 Add duration input UI in `NoteViewController.swift` (order creation screen)
    - When a DAILY product is in the cart, show a duration input field (UIStepper or text field)
    - Show per-item duration control next to each DAILY cart item
    - Default value = 1, minimum = 1 (Req 3.5)
    - When duration changes, call `CartStore.shared.updateRentalDays(at:days:)` to recalculate
    - Hide duration input for FIXED products (Req 3.3)
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ] 6.2 Auto-fill duration from pickup/return dates
    - When both pickupPlanAt and returnPlanAt are set on Cart, calculate days difference
    - Auto-update `rentalDays` for all DAILY items in cart
    - Allow manual override (user can still change per-item days after auto-fill)
    - Show calculated days in duration input field
    - _Requirements: 2.3, 3.4_

- [ ] 7. iOS — UI: Order item display with duration breakdown
  - [ ] 7.1 Update `SaleDetailCell.swift` to show duration × price for DAILY items
    - When displaying order item for DAILY product, show format: "X ngày × đơn_giá = tổng"
    - When displaying order item for FIXED product, show format: "qty × đơn_giá = tổng"
    - Read `rentalDays` from OrderItem model (already has this field from API response)
    - Read product pricingType from order item context or stored snapshot
    - _Requirements: 4.3, 4.4_

- [ ] 8. Checkpoint
  - Ensure all iOS changes compile and work together, ask the user if questions arise.

- [ ] 9. Web — Update order creation form (lower priority)
  - [ ] 9.1 Add duration input to `CreateOrderForm` for DAILY products
    - In the order items section, show a "Số ngày thuê" input for products with pricingType=DAILY
    - Default = 1, min = 1
    - Recalculate item totalPrice when duration changes: qty × unitPrice × days
    - Auto-calculate from pickup/return date range when dates are set
    - Include `rentalDuration` and `rentalDurationUnit` in API submission payload
    - _Requirements: 3.1, 3.2, 3.4, 5.1, 5.2_

  - [ ] 9.2 Update product display on web to show pricing type label
    - On product list/cards, show "/ngày" for DAILY products
    - On order items display, show "X ngày × price = total" for DAILY
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 10. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- DB migration is NOT needed — `pricingType`, `rentalDuration`, `rentalDurationUnit` fields already exist in schema
- API already calculates `rentalDays` per order item server-side, but we add client-sent `rentalDuration` to override/supplement
- API trusts frontend-calculated prices (existing behavior — Req 6.4)
- iOS is the primary target; web tasks (9.x) are lower priority
- `pricingType` values: `null`/`"FIXED"` = fixed pricing, `"DAILY"` = per-day pricing
- HOURLY is NOT in scope for this phase

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "3.1"] },
    { "id": 2, "tasks": ["1.3", "3.2"] },
    { "id": 3, "tasks": ["5.1", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["9.1"] },
    { "id": 6, "tasks": ["9.2"] }
  ]
}
```
