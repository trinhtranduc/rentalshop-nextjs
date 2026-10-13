# Spec — #951 0đ products, free lines, one line per add

Issue: #951 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `POST/PUT /api/products` accept `pricingOptions[].price` 0 and `salePrice` 0; refuse negatives (400).
2. Stored options keep a 0 price (`normalizePricingOptions`); `rentPrice`/`pricingType` follow the default option.
3. `@rentalshop/validation` product schemas accept 0, refuse negatives.
4. Orders: `orderItems[].unitPrice` 0 accepted on create and update (already true; covered by tests and e2e).
5. Product forms (web, iOS v2 + old form, Android v2 + old form): empty box = no price, "0" = 0đ; the 0đ option is
   sent; editing a 0đ product shows "0", not empty; a per-day default needs a per-day price (0 allowed).
6. A cart line has a price when: a price was typed for its mode on this order (0 included), or the product has an
   option for that mode (0 included), or a legacy `rentPrice` > 0 for that mode; a saved order line always has one.
   Otherwise rent lines show "Nhập giá" and block create / save. Sale lines never ask; they show "0đ".
7. The per-line price sheet accepts "0"; an empty box removes the typed price (back to the catalog price, or
   "Nhập giá" when there is none).
8. iOS and Android: every add appends a new line with a line id (UUID; persisted carts get one on load);
   quantity, price, note, days, remove, pricing sheet and swipe target the line id; catalog refresh and
   availability status apply to every line of the product; availability / overbooking and badges sum quantities
   across lines; editing an order loads its lines unmerged and saves them as they are.
9. Product list / detail show a 0đ rent price as "0đ"; order detail, receipt, print, share image show 0đ lines.
10. Revenue, rankings, stock and availability: a 0 line counts 0 money and holds stock like any line.

## Out of scope

Admin web forms; a "free" button; changing `salePrice` meaning on stored rows; a migration.

## API and data

No shape change. Validation loosened (0 accepted). Order lines of the same product may repeat (already allowed:
`OrderItem` has no unique key; availability sums per product).

## Acceptance

- [x] Each behavior line has a test or UI check (plan.md)
- [x] iOS and Android called out
- [x] No new user-facing strings on web; mobile strings in en + vi only where changed
- [x] Cancelled orders, VN civil days, role limits unchanged
