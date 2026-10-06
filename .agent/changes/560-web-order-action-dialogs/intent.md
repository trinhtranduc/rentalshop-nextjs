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
