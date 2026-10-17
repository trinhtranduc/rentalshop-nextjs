# Spec — Date chips: icons instead of "Lấy" / "Trả"

Issue: #1008 · Status: accepted · Intent: ./intent.md

## Behavior

1. A pickup date chip shows the pickup icon then the date; a return chip shows the return icon then the date. No word.
2. The icon is tinted with the chip text colour (#1E40AF pickup, #5B21B6 return), sized like the label text (~14pt) and vertically centred with the date.
3. Fill colours, date font sizes, the bold rule (sorted chip bold, other regular) and chip order are unchanged.
4. The accessibility label of a chip is "<localized word> <date>", e.g. "Lấy 14/10/26".
5. The same applies to the date chip of Việc cần làm rows and calendar day rows; the other chips there ("Trễ N ngày", "Chưa soạn đồ", "Sẵn sàng giao") are unchanged.

## Out of scope

The "less colour" redesign. Any API or string change.

## API and data

None. No API change.

## Acceptance

- [x] Each behavior line has a test or a UI check named in `plan.md`
- [x] iOS and Android both change (mobile parity)
- [x] No new user-facing strings (existing `orders.chip.pickup/return`, `orders_chip_pickup/return` reused as accessibility labels)
- [x] No date, cancelled-order or role rule touched
