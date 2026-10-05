# Web order form: line total follows the line's own pricing type

Issue: #444 · Author: Trinh Tran · Status: approved · Created: 2026-10-05

## Problem

On the web create/edit order form, a product whose default pricing option is per-day has
`product.pricingType = DAILY`. The web adds the line as FIXED (per rental). The line row decides
"per day" with `item.pricingType === 'DAILY' || item.product?.pricingType === 'DAILY'`, so the toggle
shows "Theo lần" while the price label shows "/ngày" and the line total shows unit × qty × days.
The saved total (`computeLineTotal`) uses FIXED, so staff see one line total and the order saves another.

Related: switching the order between RENT and SALE resets every line to `product.rentPrice` and
unit × qty, ignoring the selected pricing option and the per-day rule.

## Proposed outcome

- The line's own pricing type wins for display and totals: `item.pricingType ?? option ?? product.pricingType ?? FIXED`.
  Per day only for RENT orders.
- The line total shown on the form always equals the total that is saved.
- Switching back to RENT uses the selected option's price and the per-day rule.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` creating or editing orders in `client` (shared `packages/ui`).
No API, schema or mobile change.

## Constraints

- Do not change which option a new web line starts on (FIXED first). Product decision pending.
- Rental days stay "pickup and return day both count" (`countRentalDays`).

## Open questions

- Web starts a new line on FIXED; iOS/Android start on the merchant default. The owner chose iOS as the
  reference for mobile; the web default is left as is here and raised in the PR.

## Decision log

- 2026-10-05 — Line type wins over product type; web default option unchanged (owner).
