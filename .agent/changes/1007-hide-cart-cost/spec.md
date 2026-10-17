# Spec — Hide cost price in the mobile cart

Issue: #1007 · Status: in-progress · Intent: ./intent.md

## Behavior

1. A cart line never shows a "Giá vốn" row, for any role, rent or sale.
2. The money section never shows "Tổng giá vốn" or "Lãi dự kiến".
3. Product form and product detail still show and edit cost price (#887).
4. A cart line still carries `costPrice`; a draft with or without it still decodes.

## Out of scope

API, web, product screens, order detail.

## API and data

No change. This reverses only the cart UI from #888.

## Acceptance

- [ ] iOS and Android cart: no cost rows (cart strings removed; iOS e2e asserts absence for every role)
- [ ] Cart-cost persistence tests still pass
- [ ] Both apps build; unit tests green
