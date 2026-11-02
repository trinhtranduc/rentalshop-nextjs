# Spec: order sheet titles (#1395)

1. Each sheet shows its title: Thao tác với đơn, Giao đồ cho khách, Nhận trả đồ, Gia hạn đơn, Giấy tờ & thế chân, Thu tiền cọc, Đợt cọc chưa thu, Huỷ đơn (English in the issue).
2. One helper per platform: DS amount size (20), bold, wraps instead of clipping, marked as a heading.
3. Same top and side position on every sheet. On ⋯ the close button stays on the right of the title.
4. Under the title: the order number stays on hand-over, return, collateral and cancel; the stage number and name on collect.
5. Hand-over mode gives the hand-over title and return mode the return title (unit test).
6. Bottom-bar buttons keep Giao đồ / Nhận trả.
7. On a small iPhone with the keyboard open every sheet's confirm button stays reachable.

Out of scope: note editor system menu, money rules, API.
