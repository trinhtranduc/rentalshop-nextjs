# Web product pricing default (per-rental / per-day) like the mobile apps

Issue: #460 · Author: Trinh Tran · Status: approved · Created: 2026-10-05

## Problem

Owner decision (2026-10-05): a product can have a per-rental price ("Thuê theo lần") and a per-day price
("Thuê theo ngày"). New orders use per-rental by default, and the merchant can choose which one is the
default. In the cart / order form each rented line can switch between per-rental and per-day.

iOS (product form v2, `apps/mobile/POS ADBD/Model/ProductsV2.swift`) and Android already do this. The web:

- `ProductForm.tsx` requires the per-rental price, keeps per-day optional, and always saves per-rental as default.
- `ProductEdit.tsx` does not pass the saved `pricingOptions` to the form, so the per-day price is not shown on
  edit and saving re-sends only per-rental (the per-day option is dropped).
- The order form starts every new rented line on per-rental (`getPreferredPricingOption`, FIXED first).
- The line toggle shows on every rented line, even when the product has one price.

## Proposed outcome

- Product form: both rental prices optional; a default selector (Theo lần | Theo ngày, default Theo lần);
  a per-day default without a per-day price is blocked. Saved as `pricingOptions` with `isDefault`, same as iOS.
- Price fields hidden for users who may not set prices (OUTLET_STAFF or no `products.manage`), same as iOS.
- Order form: a new rented line starts on the product's default option; the toggle shows only when the product
  offers both modes; totals keep using `order-line-pricing.ts`.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN` editing products in `client` and `ADMIN` in `admin` (shared `packages/ui`).
Everyone creating orders in `client`. No API, schema or mobile change.

## Constraints

- No API change. The API already normalizes `pricingOptions` (one default) and syncs the default into
  `rentPrice` / `pricingType` (`packages/database/src/product.ts` `normalizePricingOptions`).
- Do not send `pricingType: 'DAILY'` on create: `productCreateSchema` then requires `durationConfig`.
  iOS omits `pricingType`; the web does the same.
- Do not touch `apps/mobile*` (other agents work there).

## Open questions

None. Sale price stays required on web (iOS: optional); not part of this decision, left as is.

## Decision log

- 2026-10-05 — iOS is the reference for prices, default selector and the cart default (owner).
