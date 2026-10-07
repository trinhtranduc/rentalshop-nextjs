# Spec — Web product pricing default

Issue: #460 · Status: approved · Intent: ./intent.md

## Behaviors

Pure helpers in `packages/utils/src/core/product-pricing-options.ts` (mirror iOS `ProductPricing` /
`ProductFormValidator`) and `order-line-pricing.ts`:

1. `getPreferredPricingOption(options)` returns the active option marked `isDefault`, else the first active
   option, else `null`. Product default DAILY → DAILY option; FIXED default → FIXED; one option → that one.
2. `offersBothPricingModes(options)` is true only when active options with price > 0 exist for both FIXED and DAILY.
3. `getProductDefaultPricingMode(product)` = type of the default option (isDefault, else first), else
   `product.pricingType`; `DAILY` → `DAILY`, anything else → `FIXED`.
4. `getProductRentalPrices(product)` returns `{ perRental, perDay }` from active options with price > 0;
   a product with no options uses `rentPrice` for the mode named by `pricingType` (legacy).
5. `buildProductPricingOptions(perRental, perDay, defaultMode)` returns only priced options, exactly one
   `isDefault`. A default without a price falls back to the mode that has one. No prices → `[]`.
6. `validateProductPricing({ perRental, perDay, defaultMode })` returns `perDayDefaultNeedsPrice` when the default
   is DAILY and the per-day price is empty or 0, and `negativeAmount` when a price is negative. Both empty is valid.

Product form (`packages/ui/src/components/forms/ProductForm.tsx`, client and admin):

7. Per-rental and per-day inputs are optional. A selector "Khi tạo đơn, mặc định tính: Theo lần | Theo ngày"
   starts on the saved default (new product: Theo lần).
8. Saving with Theo ngày and no per-day price shows the error under the selector and does not submit.
9. The payload carries `pricingOptions` from (5) and `rentPrice` = the default option's price (0 when none);
   no `pricingType` / `durationConfig`. On edit, `pricingOptions: []` clears both prices.
10. Users without `products.manage`, or with role `OUTLET_STAFF`, see no rental, default, sale or cost fields and
    the payload carries no price fields.
11. Product edit seeds the form with the saved pricing options.

Order form (`CreateOrderForm`):

12. A new rented line starts on (1); unit price = that option's price.
13. The per-rental / per-day toggle shows only when (2) is true for the line's product.
14. Line display total = saved total (unchanged, `computeOrderLineTotal`).

## Out of scope

- Sale price required/optional (web keeps it required).
- API, schema, mobile apps.
