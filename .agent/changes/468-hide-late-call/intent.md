# Hide the call button on late rows of "Việc cần làm"

Issue: #468 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

In the new mobile Orders tab, "Việc cần làm" (today work list) shows a phone button on late ("TRỄ HẠN") rows.
The owner wants the rows clean. The updated board "Việc cần làm" (Main) has no call button on any row.

## Proposed outcome

No call button on any "Việc cần làm" row, late or not, on iOS and Android. The row has no empty gap where the
button was. Calling the customer stays on the order detail screen.

Same batch, row typography (owner follow-up 2026-10-05, boards Main / Tất cả đơn / Đơn bán / Danh sách sản phẩm):

- Order rows (Việc cần làm, Tất cả đơn, Đơn bán, search, overview lists): the status tag is bigger (14pt bold,
  about 3/8 padding, radius 7; was 12pt, 2/6, radius 6). The note pills under the row ("Trễ N ngày", "Chưa soạn đồ")
  are regular weight, still 12pt with the same colours.
- Order rows: the pay line under the total ("còn thu N", "trả cọc N") is regular weight, still 14pt and coloured;
  the total stays bold.
- Product list on Home: the stock label "● Còn N" / "● Hết hôm nay" is regular weight, still 14pt and coloured.

## Affected users and systems

All shop roles using the mobile Orders tab. iOS and Android only. No API or data change.

## Constraints

- Order detail keeps its call action.
- Other rows (rent list, sale list, search, overview drill-downs) never had the button; unchanged.

## Open questions

- None.

## Decision log

- 2026-10-05 — Hide the call button on late rows; call from order detail (owner, board Main updated).
- 2026-10-05 — Bigger status tag, regular-weight notes on order rows; regular-weight stock label in the product list
  (owner, boards updated).
- 2026-10-05 — Pay line under the row total is regular weight; the total stays bold (owner, boards updated).
- 2026-10-05 — The product detail stock summary is already regular and the cart has no stock label, so only the
  Home product row changes (agent).
- 2026-10-05 — Keep the row able to show a phone (one decision function returns none) so the rule is unit-tested on
  both platforms (agent).
