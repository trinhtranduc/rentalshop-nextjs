# Spec — Cleaner Home product rows

Issue: #681 · Status: accepted · Intent: ./intent.md

## Behavior

1. A row has three text lines: name; price; stock. Lines are 8pt (iOS) / 8dp (Android) apart.
2. Price line: the default option's price bold + its unit (`/lần` or `/ngày`). If the product has the other
   rent option too, ` · <price>/<unit>` follows in the muted colour. No product code and no sale price on the row.
3. A product with no rent price but a sale price shows `bán <price>` (existing `products.price.saleShort`).
4. Stock line, 13 semibold: `● Còn N hôm nay` (green, amber when N = 1) or `● Hết hôm nay` (red). The existing
   `products.stock.free` / `v2_stock_free` gain "hôm nay" ("today"); they are only used on this row. N is unchanged:
   `effectiveAvailableToday` from `GET /api/products` (Vietnam civil day, the default outlet for a merchant).
5. + button, not in cart: pale blue circle (`#EFF4FF`) with a primary-tint plus. In cart: solid primary with the count.
   Out-today rows look and behave the same (still addable, #671).
6. Cart bar background is slate 900 (`#0F172A`); text and action stay white. Behaviour unchanged.
7. Header, search (barcode, image search), add-product permission, list loading and tab bar unchanged.

## Out of scope

Category chips, date-range availability, size grouping, grid layout, copy changes.

## API and data

None. Uses `pricingOptions` / `defaultMode` already in the list payload.

## Acceptance

- [ ] 1–6: iOS and Android screenshots of Home with: per-rental only, per-day only, both (each default), sale only, out today, in cart
- [ ] iOS unit test for the price-line parts; Android unit test for the same rule
- [ ] Both apps build
