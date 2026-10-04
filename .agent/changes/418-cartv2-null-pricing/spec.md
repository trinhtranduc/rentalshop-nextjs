# Spec — Mobile: cart sends pricing type "NULL" for products without one

Issue: #418 · Status: approved · Intent: ./intent.md

## Behavior

1. Android reads a product with `"pricingType": null`, a missing key, an empty string or a value
   outside `FIXED` / `HOURLY` / `DAILY` as `FIXED`. Known values are upper-cased and kept.
2. Pricing options are read the same way (`type`).
3. The order payload (`createOrder`, `updateOrder`) never carries a pricing type outside
   `FIXED` / `HOURLY` / `DAILY`; anything else is sent as `FIXED`. This also covers a cart
   draft saved before the fix that still holds `"NULL"`.
4. Such a product offers only the per-rental price: the per-day toggle in `CartV2` stays hidden.

## Out of scope

- iOS (no bug: `pricingType` is `String?`, nil falls back to `FIXED`).
- Products stored with a null pricing type (no data change).

## API and data

No API change.

## Acceptance

- [ ] Behaviors 1–4 covered by `CartNullPricingTest` (Android), failing before the fix
- [ ] Manual: a rent order with products 32 and 33 from `CartV2` on Android and on iOS is created;
      the DB items show `FIXED`
