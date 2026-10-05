# Spec — iOS truncated names and English plurals

Issue: #430 · Status: approved · Intent: ./intent.md

## Behavior

1. `OrderRowCell` at 390pt width shows "Nguyễn Văn Kiểm Thử" untruncated on a completed sale row with
   "✓ paid in full" and a short item line (the label's width ≥ its intrinsic width).
2. The money column never grows wider than its content; the left column takes the free width.
3. The order detail nav title scales down (min 70%) instead of truncating a long order number.
4. iOS `PluralText.key(base, count)` returns `base + ".one"` for 1 and `base` otherwise.
5. In English: "1 day", "1 order", "Cart · 1 item", "1 order matches …", "Show 1 order", "%@/day × 1 day",
   "Return late 1 day", "Hand-over late 1 day", "Late fee (1 day)". 0 and 2+ stay plural.
6. Every `.one` key exists in `en` and `vi-VN` (Vietnamese text equals the plural form).
7. Android: the same strings are `<plurals>` with `one`/`other` in `values` and `other` in `values-vi`,
   read with `pluralStringResource` / `getQuantityString`.

## Out of scope

Older screens (availability, drafts, reports), the type scale, other locales (mobile ships en + vi only).

## API and data

None.

## Acceptance

- [x] Lines 1, 4–6 have iOS unit tests (`Issue430Tests`); line 7 has an Android resources test
- [x] iOS and Android both changed
- [x] New strings in `en` and `vi` for both apps
- [ ] Line 3 checked on the simulator (see PR)
