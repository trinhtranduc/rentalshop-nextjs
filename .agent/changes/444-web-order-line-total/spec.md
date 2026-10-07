# Spec — Web order form: line total follows the line's own pricing type

Issue: #444 · Status: approved · Intent: ./intent.md

## Behavior

1. A RENT line with `pricingType = FIXED` on a product whose `pricingType` is DAILY is shown per rental
   (no "/ngày") and its line total is unit × qty.
2. A RENT line with `pricingType = DAILY` totals unit × qty × days (days = `countRentalDays`, min 1).
3. A SALE order ignores days: every line totals unit × qty.
4. For any line, the displayed line total equals the total used for the subtotal and the saved order
   (`computeOrderLineTotal`).
5. The FIXED/DAILY toggle on the row shows the same resolved type the totals use.
6. Switching the order to SALE sets unit = salePrice (fallback rentPrice), total = unit × qty.
   Switching to RENT sets unit = the selected option's price (by id, else the option matching the line's
   type, else rentPrice) and the total by rule 1/2.

## Out of scope

- Which option a new web line starts on (stays FIXED first).
- API, mobile apps, preview of saved orders.

## API and data

None. Payload fields are unchanged; `totalPrice` and `pricingType` now agree with what the form shows.

## Acceptance

- [x] Behaviors 1–4 and 6 covered by `tests/order-form-line-pricing.test.ts`
- [x] Behavior 5: the row toggle reads the same helper (code review)
- [x] No API shape change, so no mobile change
- [x] No new strings
- [x] Rental days still counted in Vietnam civil days via `countRentalDays`
