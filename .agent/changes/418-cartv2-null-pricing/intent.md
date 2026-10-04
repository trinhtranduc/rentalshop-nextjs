# Mobile: cart sends pricing type "NULL" for products without one

Issue: #418 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

A product whose `pricingType` is null in the DB (seed products 32 and 33) is sent to
`POST /api/orders` with `pricingType: "NULL"`. The API accepts only `FIXED`, `HOURLY` or
`DAILY` (or no value), answers `VALIDATION_ERROR`, and the order cannot be created. Found in the
new Android cart (`CartV2`, flag `newProducts`) while testing #413.

## Proposed outcome

A product with a null or unknown pricing type is priced and sent as `FIXED` (per rental), the
same default iOS and the API use. The per-day toggle stays hidden for such a product. The order
is created.

## Affected users and systems

All roles that create or edit rent orders on Android with a product that has no pricing type.
No API or web change.

## Constraints

- No API change. Stacked on #388 (`CartStore` changes); keep the diff small.
- Failing test first (`bug-fix-tdd`).

## Open questions

- None.

## Decision log

- 2026-10-04 — Default = `FIXED`: iOS `CartItem` and `Cart` use `product.pricingType ?? "FIXED"`,
  the Android model default is `FIXED`, and the API falls back to the product/merchant type.
- 2026-10-04 — iOS decodes `pricingType` as `String?` (JSON null → nil → `FIXED`); it does not
  have the bug, so no iOS change.
