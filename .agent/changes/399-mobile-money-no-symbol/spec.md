# Spec — Mobile: new screens show money without a currency symbol

Issue: #399 · Status: approved · Intent: ./intent.md

## Behavior

1. iOS `MoneyFormatter.format` returns "1.150.000" for 1150000, "0" for 0, "−50.000" for -50000,
   and "1.234.567.890" for 1234567890. No symbol.
2. Android `formatMoneyVnd` returns the same strings for the same inputs.
3. iOS `MoneyInput.display(1250000)` still returns "1.250.000" (it used to drop the trailing "đ").
4. iOS hand-over/return sheets prefill the amount field with "1.250.000" (no "đ" strip needed).
5. The v2 product form price fields have no "đ" unit label (iOS and Android).
6. The v2 cart discount-type choice reads "%" and "Số tiền"/"Amount" instead of "%" and "đ"
   (iOS via an opt-in title on the shared number picker; old screens keep "đ").
7. No new-screen string resource contains a currency symbol next to a money placeholder.
8. Old screens (flags off) do not call either formatter and are unchanged.

## Out of scope

- Old screens, receipts, printing, payment QR, the API, web apps.
- Reading the merchant currency to show a symbol (owner chose no symbol at all).

## API and data

None.

## Acceptance

- [x] Each behavior line has a test or a UI check named in `plan.md`
- [x] iOS and Android both changed
- [x] New strings: one key per app ("Số tiền"/"Amount"), en + vi
- [x] No business rule changes
