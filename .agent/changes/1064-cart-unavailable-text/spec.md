# Spec — Cart availability note

Issue: #1064 · Status: approved · Intent: ./intent.md

## Behavior

`CartV2Logic.availabilityNote(available:asked:isRent:)` (iOS `Model/ProductsV2.swift`, Android
`domain/products/ProductRules.kt`) returns the shown text key, the spoken (VoiceOver/TalkBack) key, the count and
the tone, or nothing. `asked` = units of the product across all its cart lines (#951), at least the line's quantity.

| `available` | Tone | Shown (vi / en) | Spoken rent | Spoken sale |
|---|---|---|---|---|
| nil (not loaded) | nothing shown | | | |
| ≤ 0 | `.none` red | rent "Hết đồ" / "Booked out"; sale "Hết hàng" / "Out of stock" | "Hết đồ trong ngày đã chọn" | "Hết hàng" |
| 1, and ≥ asked | `.low` amber | "Còn 1" / "1 left" | "Còn 1 trong ngày đã chọn" | "Còn 1 trong kho" |
| ≥ 1 but < asked | `.low` amber | "Chỉ còn N" / "Only N left" | "Chỉ còn N trống trong ngày đã chọn" | "Chỉ còn N trong kho" |
| ≥ 2 and ≥ asked | `.ok` green | "Còn N" / "N left" | "Còn N trong ngày đã chọn" | "Còn N trong kho" |

Example: 2 free, 3 in the cart → amber "Chỉ còn 2" (the cart cannot be filled).

Owner (2026-10-18): "text còn trống dài quá, cần gọn lại" — the shown text drops "trong ngày đã chọn" (the dates are
on the cart); the spoken text keeps it.

Keys:

| Use | iOS | Android |
|---|---|---|
| shown "Còn %d" / "%d left" | `products.cart.left` (new) | `v2_cart_left` (new) |
| shown "Chỉ còn %d" / "Only %d left" | `products.cart.onlyLeft` (new) | `v2_cart_only_left` (new) |
| shown "Hết đồ" / "Booked out" | `products.cart.bookedOut` (new) | `v2_cart_booked_out` (new) |
| shown + spoken "Hết hàng" / "Out of stock" | `products.cart.outOfStock` (new) | `v2_cart_out_of_stock` (new) |
| spoken rent, enough | `products.cart.freeRent` (new) | `v2_cart_free_rent` (new) |
| spoken rent, 0 | `products.cart.unavailableRent` (new) | `v2_cart_unavailable_rent` (new) |
| spoken rent, fewer | `products.cart.shortRent` | `v2_cart_short_rent` |
| spoken sale | `products.cart.inStock`, `products.cart.shortStock` | `v2_cart_in_stock`, `v2_cart_short_stock` |

No existing key had exactly "Hết đồ"/"Booked out" in both languages (`products.calendar.legend.out` is "Hết" in vi).
English "1 left" / "N left" share one format, so no plural resource.

Colours: `.ok` `DS.Status.done` (#047857 on #D1FAE5), `.low` `DS.Status.waiting` (#1055), `.none` #991B1B on
#FEE2E2. Same pill; `.ok`/`.low` medium weight, `.none` bold (iOS) / SemiBold (Android).

- The pill sits beside the name. The sale line's separate grey "Còn N trong kho" row is removed: one count per line.
- Rent line with the overlap tag "Hết dd/MM → dd/MM ›": the note is hidden (tag unchanged).

## Out of scope

Product detail strip, the overlap tag, the item note style, availability in the API.

## API and data

No API change.
