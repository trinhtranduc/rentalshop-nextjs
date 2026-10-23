# Spec — Public shop hide prices and open booking

Issue: #1174 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `Merchant.showPublicPrice` is a boolean, default `true`. Existing shops keep showing prices.
2. `PUT /api/settings/merchant` accepts optional `showPublicPrice` (boolean). MERCHANT or ADMIN only, same as `onlineBookingEnabled`. Omitted → unchanged. Other roles 403.
3. Settings → Trang shop công khai has “Hiện giá trên trang shop”, default matching the column. Saving persists via (2).
4. `GET /api/public/{tenantKey}/products` includes `merchant.showPublicPrice`. When false, each product has `rentPrice`, `salePrice`, `deposit`, and `pricingOptions[].price` as `null` (fields stay; values hidden). Same rule on public image-search product payloads that reuse `toPublicProduct`.
5. Public UI (grid, sheet, image search, booking picker estimate, request summary, tracking) shows the translated “Liên hệ” instead of amounts when `showPublicPrice` is false. 12 public locales.
6. Image search result cards never render in-stock / out-today (“Còn hôm nay / Hết hôm nay”), even when prices are on.
7. Booking calendar does not fetch availability. Future Vietnam civil days are selectable. No full-day strike, no “Đã chọn / Hết” legend, no “range already booked” copy. Past days stay disabled. Add-to-cart works for any selected range.
8. `POST /api/public/{tenantKey}/booking-requests` does not return 409 `BOOKING_NOT_AVAILABLE` for full days. Dates, outlet, products, honeypot, and rate limits stay. 201 on a valid request even if stock would be exceeded.
9. Confirming a request into an order is unchanged (`allowOverlappingOrders` / shop availability).

## Out of scope

iOS/Android settings. Removing `BOOKING_NOT_AVAILABLE` from error catalogs. Changing shop POS overlap. Payment online. Hiding stock numbers other than the image-search Còn/Hết chip.

## API and data

- Prisma: `Merchant.showPublicPrice Boolean @default(true)` (additive).
- Public ids remain numbers.
- `GET` public products: additive `merchant.showPublicPrice`; price fields nullable when hidden.
- `PUT` settings merchant: optional boolean.
- `POST` booking-requests: fewer 409s, same 201 body.

## Acceptance

- [ ] Tests: public product hide prices; booking POST succeeds without stock; calendar days selectable without availability; image search source has no inStockToday chip
- [ ] iOS/Android: no contract they call; no app change
- [ ] Settings strings in vi, en, ja, ko, zh; public “Liên hệ” in 12 locales
- [ ] LOG.md rows
- [ ] Browser: toggle off → catalog Liên hệ; booking sends on a busy range
