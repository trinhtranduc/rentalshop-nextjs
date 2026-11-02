# Spec — Order detail: one compact money block

Issue: #1435 · Status: accepted · Intent: ./intent.md

## Behavior

Rentals only. "Line" means a row of the block, in this order.

1. THANH TOÁN holds: Tạm tính, Giảm giá (when > 0), Tổng tiền thuê, then the deposit, then the amount due. "Tạm tính" is no
   longer under MÓN on a rental.
2. A single deposit reads "Đã cọc" (`share.deposit.paid`). On Android a rented order has no such line, as today.
3. Stages sit inside THANH TOÁN before the amount due: title "Thu cọc theo giai đoạn", "Sửa" on a booked order, a 4 pt bar,
   "Đã thu N% · amount", "Còn phải thu amount", the stage rows, the light "Thu giai đoạn N" button.
4. An uncollected last stage (`rest`) of a booked order is not a row: it is in the amount due. It is a normal row once
   collected, or after hand-over.
5. "Còn phải thu" hides only when it equals the amount due (with money collateral: the rental part of it).
6. With money collateral and no PICKUP payment: one line "Khách đưa lúc nhận đồ" with `cashAtHandover`, and the sub-line
   "tiền thuê X + thế chân Y". Otherwise "Đã thu trước" if any, then "Thu khi giao" with `collectOnDeliveryShown`.
7. Font rule of the block: labels 15 regular grey; amounts 15 regular black, right-aligned, tabular digits; Tổng tiền thuê 15 bold;
   the amount due now label 15 bold, amount 20 bold; headings and sub-lines 14. A finished order has no large figure.
8. "Khi nhận trả: trả khách / thu thêm" keeps its place (under GIẤY TỜ & THẾ CHÂN when that shows) in the amount-due style.
9. Both "Thu giai đoạn N" buttons stay and do what they do today; same ids. A part-collected stage or all stages collected shows neither.
10. Rented order: iOS keeps "Đã cọc", fees with "+"; Android keeps "Trả lại thế chân", "Đã thanh toán trước", red fees.
11. A paid stage has ✓ and the word "Đã thu", an unpaid one its number and "Chờ thu", a part-collected one "Thu một phần". Never colour alone.
12. "Sửa" of the stages and of the papers use one blue (#1D4ED8). Long labels wrap; they are not cut at 320 wide.
13. Every id stays: `order.detail.paymentSection`, `deposit.section`, `deposit.card`, `deposit.card.badge`, `deposit.card.edit`,
    `deposit.card.collect`, `deposit.stage.<key>`, `order.detail.collectStage`, `order.detail.collateralSection`.

## Out of scope

- Sales. Share image and printed receipts. The hand-over and return sheets. Any money rule. "Ảnh khi giao", note colours,
  status warning, sheet titles, "Phụ phí" strings. The option of removing a "Thu giai đoạn N" button.

## API and data

No API path changes. No field added or changed. No `.agent/api-changes/LOG.md` row.

## Acceptance

- [ ] Lines 1-6, 8-10 have a unit test on each app, one per case of the tab (9 cases)
- [ ] Line 7 has a unit test for tabular digits on iOS and a look at every screenshot
- [ ] `test5j`, `test5k`, `testPhotos10` still pass on iOS
- [ ] `git diff origin/dev` of the share and receipt files is empty; share tests still pass
- [ ] iOS and Android changed in the same PR
- [ ] New string in `en`, `vi` of both apps (the mobile apps have only these two)
- [ ] Screenshots: one per case per app in `~/Documents/AnyRent-shots/order-money/`
