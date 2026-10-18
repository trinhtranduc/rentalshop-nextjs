# Cart: one availability note per line (0 red, 1 amber, 2+ green)

Issue: #1064 · Author: Trinh Tran · Status: approved · Created: 2026-10-18

## Problem

- With nothing free, a cart line says "Chỉ còn 0 trống trong ngày đã chọn" / "Only 0 free on these dates"
  (sale: "Chỉ còn 0 trong kho"). It reads as if a unit is left.
- A rent line with enough units says nothing. A sale line shows a grey "Còn N trong kho" on its own row, and
  can show it next to the shortage pill (two counts on one line).

## Proposed outcome

Owner: "nếu only 0 free on this date thì nó là unavailable or out of stock", "những sản phẩm còn thì sẽ báo còn
bao nhiêu luôn", "nếu 1 thì báo cam, còn > 1 thì hiện xanh".

One short pill per line, once availability is loaded: red "Hết đồ" / "Hết hàng" at 0; amber "Còn 1", or
"Chỉ còn N" when fewer than asked; green "Còn N" at 2+ and enough for the cart. VoiceOver/TalkBack read the longer
"… trong ngày đã chọn" / "… trong kho".

## Affected users and systems

All cart users (rent and sale), iOS and Android. No API.

## Constraints

Goes into the current release (#1049). No API change. Keep the #1057 stable render (nothing until loaded).

## Decision log

- 2026-10-18 — 0 = "unavailable / out of stock" text in red (owner)
- 2026-10-18 — show the count when enough units are left (owner)
- 2026-10-18 — 1 amber, > 1 green; 2+ but fewer than asked stays amber (owner, coordinator)
- 2026-10-18 — shorter texts, drop "trong ngày đã chọn" from the pill (owner: "text còn trống dài quá")
- 2026-10-18 — item note box change dropped; the owner keeps the #1063 look
- 2026-10-18 — green = `DS.Status.done` (#047857 on #D1FAE5): the existing token; the detail strip's #065F46
  is a literal, not a token
