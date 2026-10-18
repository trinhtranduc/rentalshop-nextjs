# Mobile release polish: product order sort, cart price flash, cart money rows

Issue: #1056 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-18

## Problem

1. A product's order lists disagree. "Tất cả N" (orders by product) shows the farthest pickup first
   (`pickupPlanAt desc`); the product detail chips "Sắp tới" / "Đang thuê" show the nearest first (`asc`).
   The Vietnamese direction label for `desc` reads "Gần nhất trước" although the list puts the latest date first.
2. On the cart, the blue price link of each line ("200.000đ / theo lần ⌄") flashes a few times when the cart
   opens or updates.
3. In the cart's TIỀN section every row looks the same; only a small grey › hints that "Giảm giá" and "Đặt cọc"
   can be changed, and the order note is a pale button without an edit mark.

## Proposed outcome

1. "Sắp tới" sends `pickupPlanAt desc`, "Đang thuê" `returnPlanAt desc`, "Đã xong" keeps `createdAt desc`.
   Pickup/return directions read "Mới nhất trước" (`desc`) / "Cũ nhất trước" (`asc`); English keeps
   "Latest first" / "Earliest first". The main order list shows the same new words (text only).
2. The price link shows once and stays still while availability, prices and the overlap setting load.
3. TIỀN follows "blue = tappable": "Tiền thuê" and "Tổng cộng" stay black with no chevron; "Giảm giá" and
   "Đặt cọc" show the value blue, bold, with a small blue pencil and no ›; the order note is a row "Ghi chú"
   with blue "Thêm" + pencil when empty, else the note on one line (#334155) + pencil. Sheets are unchanged.

## Affected users and systems

All cart and product-detail users (MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY), iOS and Android.
No API, schema, or env change.

## Constraints

- Installed apps keep working: the API is untouched; only the `sortOrder` value the new app sends changes.
- Do not touch the cart shortage-warning block (#1054, another branch).
- Keep the sheets, row order, bottom bar, and edit-order mode.

## Decision log

- 2026-10-18 — farthest pickup on top in every product order list; "Đang thuê" follows with `returnPlanAt desc` (owner)
- 2026-10-18 — TIỀN rows: blue value + pencil for editable rows, mockup `cartmoney.html` (owner)
