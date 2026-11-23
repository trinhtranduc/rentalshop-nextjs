# Spec — Bill: phí trễ, phụ thu khi nhận trả

Issue: #1633 · Status: accepted · Intent: ./intent.md

## Behavior

Inputs of an order: type, status, `totalAmount` (after discounts), `depositAmount`, `securityDeposit` (money
collateral), `lateFee`, `damageFee`, `cancelKeptAmount`, deposit plan (`hasDepositPlan`, collected stages).

1. **Return block.** A rental that is not a draft and not cancelled, with `lateFee + damageFee > 0`, gets a block titled
   "Khi nhận trả" with these rows, each only when above 0, in this order: Thế chân (`securityDeposit`), Cọc dư
   (`max(0, depositAmount − totalAmount)`), Phí trễ (`lateFee`), Phụ thu (`damageFee`).
2. **Return result.** `net = lateFee + damageFee − securityDeposit − excessDeposit`. `net > 0` → "Thu thêm net";
   `net ≤ 0` → "Trả khách −net" (0 shows "Trả khách 0đ").
3. **Cancel block.** A cancelled rental with `cancelKeptAmount > 0` gets a block titled "Đã huỷ" with "Phụ thu"
   (`cancelKeptAmount`) and the result "Hoàn cho khách" = `max(0, collected − cancelKeptAmount)`, where collected is the
   plan's collected amount for an order with a deposit plan, else `depositAmount` (same as the order detail, #1491).
4. **No block** for a sale, a draft, a rental without fees (G: collateral but no fee), or a cancelled order that kept
   nothing. Those bills are unchanged.
5. **Where.** Share image (iOS, Android): the block follows the money part (after Thế chân / Khách đưa lúc nhận đồ),
   before the order note and QR; "Trả khách" / "Hoàn cho khách" in a green box, "Thu thêm" in the blue "Thu khi giao"
   box. Printed bill iOS / Android: after "TỔNG CỘNG", a rule, the title upper-case, `Nhãn: số` lines, the result line
   upper-case and bold. Web slip: after "Tổng cộng" (and the stages block), a dashed rule, the title, rows, the result
   in the total style.
6. **Web slip "Phụ phí" row.** Removed from the top rows; the surcharge is in the block as "Phụ thu".
7. **Words** (vi / en): Khi nhận trả / At return · Thế chân / Security deposit · Cọc dư / Deposit above the rent ·
   Phí trễ / Late fee · Phụ thu / Surcharge · Trả khách / Give back · Thu thêm / Collect · Đã huỷ / Cancelled ·
   Hoàn cho khách / Refund to customer. The apps' other languages and the web's 12 locales get translations.
8. **Money format** as each bill already prints it (`1.150.000đ` on the image and web; the printer's own format).

### Cases (approved mockup)

| # | Total | Deposit | Collateral | Late | Surcharge | Block |
|---|---|---|---|---|---|---|
| A | 500.000 | 200.000 | 0 | 0 | 0 | none |
| B | 500.000 | 200.000 | 1.000.000 | 100.000 | 50.000 | Thế chân 1.000.000 · Phí trễ 100.000 · Phụ thu 50.000 → Trả khách 850.000 |
| C | 500.000 | 200.000 | 0 | 0 | 150.000 | Phụ thu 150.000 → Thu thêm 150.000 |
| D | 500.000 | 200.000 | 100.000 | 100.000 | 200.000 | Thế chân 100.000 · Phí trễ 100.000 · Phụ thu 200.000 → Thu thêm 200.000 |
| E | 300.000 | 500.000 | 0 | 0 | 50.000 | Cọc dư 200.000 · Phụ thu 50.000 → Trả khách 150.000 |
| F | 500.000 | 200.000 | 300.000 | 0 | 300.000 | Thế chân 300.000 · Phụ thu 300.000 → Trả khách 0 |
| G | 500.000 | 200.000 | 1.000.000 | 0 | 0 | none |
| H | 500.000 (cancelled) | 300.000 | 0 | – | kept 100.000 | Đã huỷ · Phụ thu 100.000 → Hoàn cho khách 200.000 |

## Out of scope

Late days on the bill, the order detail screens, the API, the cart/draft image, sale orders, the label printer.

## API and data

None. Reads fields the clients already receive (iOS `Order` / `OrderDetail`, Android `Models.kt`, web order detail).

## Acceptance

- Unit tests for the rule on iOS, Android and web cover cases A–H; share-image tests show the block for B and H and none
  for A and G; the web slip model drops the "Phụ phí" row.
- iOS and Android build; web lint, type-check and the receipt tests pass; `locales-valid-json` passes.
- Screenshots of the share image and the printed-bill preview for case B on both apps.
