# Online booking from the public product link

Issue: #974 · Author: Trinh Tran (agent draft) · Status: approved (owner, 2026-10-14) · Created: 2026-10-14
Mockup: https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4#booking (tab "Đặt thuê online") · copy: ./mockup.html

## Problem

The public shop page (#665, `/[tenantKey]/products`) only lets a customer look at products and
"Gọi shop / Hỏi thuê qua Zalo". Every booking still starts with a phone call or chat, the shop retypes it, and
requests sent outside working hours get lost.

## Proposed outcome

- A shop turns on **"Cho khách đặt online"**. On the public page a customer picks a **branch**, adds several
  products ("+ Đặt thuê"), picks pickup and return days, leaves name, phone and a note, and sends a
  **booking request**. No account, no online deposit.
- Prices follow each product's **default pricing mode** (per day or per time). The customer cannot change it.
- The server checks stock for those days at that branch before accepting; if something is out, the customer is
  told at once and nothing is created.
- The request is **not an order**: no revenue, no stock held, invisible to installed apps' order lists. The shop
  owner and that branch's staff get a push and see it under **Đơn hàng › Chờ xác nhận** (app and web).
- Opening a request re-checks stock per item (plus a **↻ Kiểm lại** button). **Xác nhận** opens the cart / order
  form pre-filled; staff adjust (deposit, collateral, discount, per-day vs per-time, prices, items/days) and tap
  **Tạo đơn** → a normal RENT order "Đã đặt"; the request becomes "Đã xác nhận · #order". **Từ chối** needs a reason.
- Requests show how long they have waited; unhandled ones expire after the pickup day. After creating the order
  (or rejecting) staff can open Zalo with a ready-made message.

## Affected users and systems

- Customers of a shop (public, anonymous). Roles: MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY
  (handle requests of their branch; MERCHANT all branches). ADMIN/OPS: none.
- Apps: `api`, `client` (public page + shop web), iOS, Android. Data: new tables, a merchant setting.

## Constraints

- Installed apps cannot be force-updated: requests live in their own table; no new order status; existing
  responses unchanged; a new push type carries only string data and no `orderId` (as `SHIFT_CHANGED`, #907).
- Free feature (not an add-on). Off by default.
- Vietnam civil days for pickup/return (`timezone-dates`). Server time for "waiting" and expiry.
- Public endpoints: tenant isolation, rate limits, no data of other shops, no PII echoed back.
- Keep it simple (owner): one confirm path (through the cart), no auto-messages to customers, no deposit, no hold.

## Decision log

- 2026-10-14 — Only RENT; multi-item; no stock hold while pending; no online deposit; free; off by default. (owner)
- 2026-10-14 — Multi-branch: customer picks the branch first; products and stock filtered by branch; cart shows branch name, address, phone ("Nhận đồ tại"). (owner)
- 2026-10-14 — Push to the shop owner and the chosen branch's staff. (owner)
- 2026-10-14 — Price = product's default pricing mode; customer cannot change it; staff change it in the cart. (owner)
- 2026-10-14 — Confirm goes through the cart (pre-filled), never one-tap; exactly one order per request. (owner, on agent's proposal)
- 2026-10-14 — Waiting time shown (red > 2 h); auto "Hết hạn" after the pickup day; Zalo message templates; ↻ Kiểm lại on the request detail. (owner)
