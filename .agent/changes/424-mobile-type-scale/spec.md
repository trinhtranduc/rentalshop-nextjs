# Spec — One type scale for the new mobile UI

Issue: #424 · Status: in-progress · Intent: ./intent.md

## Behavior

1. iOS `DS.TextSize` and Android `DS.TextSize` hold the same values: `title` 24, `amount` 20, `name` 17,
   `body` 15, `secondary` 14, `pill` 12, `input` 16 (Android in sp).
2. A unit test on each platform pins those values and the spacing tokens (`DS.Gap`).
3. Mapping rule (canvas → code): 10/11 → 12; 12 → 14 unless pill/tag/badge/tab label (stays 12);
   13 → 14, except the order-row item line and the product-row barcode line → 15; 14 → 15;
   15 bold/semibold text (names, totals, prices, card titles) → 17, 15 in buttons/controls stays 15;
   16 bold text (names, card titles) → 17, 16 inputs/buttons stay 16; ≥ 17 unchanged.
4. No font size 11 or 13 (and nothing below 12) is left in the new-UI files listed in `plan.md`.
5. Order list row: padding 15 top/bottom, 16 horizontal; gap between text lines 5.
   Product list row: padding 14, min height 96; text line gap 4–5.
6. Long customer and product names still truncate with an ellipsis on one line where they did before.
7. Old screens (flags off) and shared components used by them render with the same sizes as before.

## Out of scope

- Tab bar (shared shell; labels already 12), system bars, old screens, web apps, the API.
- Icon sizes (#396) and colors.

## API and data

None.

## Acceptance

- [ ] Token tests green on iOS and Android
- [ ] `grep` for size 11/13 literals on the new-UI files returns nothing
- [ ] iOS and Android builds succeed (or the report says why they could not run)
- [ ] Screens compared with the canvas boards where a device was available
