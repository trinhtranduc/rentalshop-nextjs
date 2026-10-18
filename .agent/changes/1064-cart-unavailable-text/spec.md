# Spec — Cart availability note

Issue: #1064 · Status: approved · Intent: ./intent.md

## Behavior

`CartV2Logic.availabilityNote(available:asked:isRent:)` (iOS `Model/ProductsV2.swift`, Android
`domain/products/ProductRules.kt`) returns text key, count and tone, or nothing:

| `available` | Tone | Rent text | Sale text |
|---|---|---|---|
| nil (not loaded) | — (nothing shown) | | |
| ≤ 0 | `.none` red | `products.cart.unavailableRent` / `v2_cart_unavailable_rent` | `products.cart.outOfStock` / `v2_cart_out_of_stock` |
| 1, or 2+ but < asked | `.low` amber | `products.cart.shortRent` / `v2_cart_short_rent` | `products.cart.shortStock` / `v2_cart_short_stock` |
| ≥ 2 and ≥ asked | `.ok` green | `products.cart.freeRent` / `v2_cart_free_rent` | `products.cart.inStock` / `v2_cart_in_stock` (reused) |

`asked` = units of the product across all its cart lines (#951), at least the line's own quantity.
Example: 2 free, 3 in the cart → amber "Chỉ còn 2 trống…".

Strings:

| Key | vi | en |
|---|---|---|
| unavailableRent | Không còn trống trong ngày đã chọn | Unavailable on these dates |
| outOfStock | Hết hàng | Out of stock |
| freeRent | Còn %d trống trong ngày đã chọn | %d free on these dates |

Colours: `.ok` `DS.Status.done`, `.low` `DS.Status.waiting` (#1055), `.none` #991B1B on #FEE2E2. Same pill shape
and size; `.ok`/`.low` medium weight, `.none` bold (iOS) / SemiBold (Android).

- The pill sits beside the name, as the shortage pill does today. The sale line's separate grey "Còn N trong
  kho" row is removed: one count per line.
- Rent line with the overlap tag "Hết dd/MM → dd/MM ›": the note is hidden (tag unchanged).
- The pill is a text label, so VoiceOver/TalkBack read the new text.

## Out of scope

Product detail strip, the overlap tag, availability thresholds in the API.

## API and data

No API change.
