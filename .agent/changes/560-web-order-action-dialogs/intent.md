# Intent — #560 Chi tiết đơn action dialogs

## What
The order page (`/orders/[orderNumber]`, redrawn in #516) still opens the old shared dialogs from
`@rentalshop/ui`: "Giao đồ cho khách" (cube icon, `−96 / +96` rows, blue box, green focus ring),
"Nhận trả", "Huỷ đơn" and "Xoá đơn". Owner: "UI này tôi nghĩ cũng nên đổi lại". Redraw them in the
shell look, with the rows, labels and order of the iOS hand-over / return sheets, in words.

## Why
They are the last old-look pieces on the page, and the sign puzzle (`Đã đặt cọc −96`, `Thế chấp +96`)
makes staff stop and do arithmetic while the customer waits.

## Constraints
- iOS is the reference for amounts and labels (`OrderHandOverSheetViewController.swift`,
  `OrderDetailLogic.swift`). Do not invent a money rule.
- Presentation only. The calls and bodies sent to the API stay the same. No API, mobile or
  `packages/**` change (admin keeps the shared dialogs).
- Where iOS, the API and the approved board disagree, ask the owner in the PR.
- Shell tokens, dark mode, 390px, focus ring on the palette.

## Dates
The "10/8/2026" / "10/16/2026" the owner saw are inside the Ghi chú card: they are the seeded
`pickupNotes` / `returnNotes` text ("Scheduled pickup on 10/8/2026", written by
`scripts/regenerate-entire-system-2025.js` with `toLocaleDateString()`), not a date the page formats.
The page's own dates already use `T5 08/10`. The new dialogs show the schedule the same way.
User-typed note text is not rewritten.

## Decision log

- 2026-10-06, owner answers to the PR questions: "Thế chân … -> theo ios, Trừ khoản đã thu trước -> như ios,
  Phí trễ -> tương tự như ios cho nhập, Huỷ đơn -> tương tự ios, Script seed -> thử việt nam".
  1. Thế chân stays inside "Thu khi giao" (iOS `HandOverMoney.due`). The page's Thanh toán card also
     follows iOS `OrderDetailViewController.moneyRows` now (rows, labels, order), in words, same amounts.
  2. Earlier PICKUP / RETURN_ADJUSTMENT payments are subtracted. The card, the next-step button and both
     dialogs read one model (`handOverMoney` / `returnMoney` in `orders-model.ts`; `orderBalance` uses it).
  3. Late fee is typed on Nhận trả, prefilled with the saved `order.lateFee` (iOS prefills `detail.lateFee`;
     nothing in the API computes a late fee). Like iOS `confirm`, when either fee changed the web sends
     `PUT /api/orders/{id} {damageFee, lateFee}` before the status PATCH. This changes what the web sends.
  4. Huỷ as iOS `OrderDetailLogic.actions`: RENT RESERVED/PICKUPED, SALE RESERVED/COMPLETED, for
     `orders.manage`; same `PATCH …/status {"status":"CANCELLED"}`; iOS wording, no extra note (iOS has none).
  5. Seed text in Vietnamese with Vietnam dates: separate issue and PR (`chore(seed)`).
