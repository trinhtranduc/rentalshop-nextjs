# Spec — Online booking from the public product link

Issue: #974 · Status: approved 2026-10-14 · Intent: ./intent.md · Mockup: ./mockup.html

Ids on the wire are the numeric `id`s the API already exposes. A "day" is a Vietnam civil day key `YYYY-MM-DD`.
"Request" = booking request (new model), never an order until confirmed.

## Behavior

### Shop setting

1. `Merchant.onlineBookingEnabled` (boolean, default false). MERCHANT changes it (web Cài đặt cửa hàng → Đặt hàng
   online; app Cài đặt). Off → the public page shows no "+ Đặt thuê" and the public booking routes answer 403
   `ONLINE_BOOKING_DISABLED`. The settings screen also shows the shop link (copy / share).

### Public page (customer, no login) — `apps/client/app/[tenantKey]/products`

2. **Branch first.** If the merchant has more than one active outlet, the customer picks one (name, address,
   phone). The choice is kept in the URL (`?outlet=<id>`) and can be changed ("📍 … · Đổi" on phone, a picker at
   the top right on desktop). One outlet → no picker. Changing branch reloads products and empties the booking cart
   (confirm if it has items).
3. **Products of that branch.** `GET /api/public/[tenantKey]/products?outletId=` lists only products stocked at that
   outlet (OutletStock row, stock > 0), active, not deleted; existing fields unchanged; adds `defaultPricing:
   { type: 'DAILY'|'FIXED', price }` (additive) from the default pricing option (`isDefault`, else first;
   `getProductDefaultPricingMode`). Card shows that price as "350.000/ngày" or "75.000/lần".
4. **Booking cart** (client-side, per tenant + outlet, in `localStorage`, survives reload): lines `{ productId,
   quantity }`. Shows "Nhận đồ tại <outlet name>" + address + phone, pickup → return days (required; return ≥
   pickup; VN days; past days not allowed), each line `price × days` for DAILY or `price · theo lần` for FIXED,
   quantity ±, remove, subtotal, name (required), phone (required, VN format), note (optional, ≤ 500).
   The customer never chooses the pricing mode. Phone: 2-column grid + bottom bar "N món · Xem đặt thuê";
   desktop: 4-column grid + cart panel on the right.
5. **Submit** `POST /api/public/[tenantKey]/booking-requests` `{ outletId, pickupDate, returnDate, customerName,
   customerPhone, note?, items: [{ productId, quantity }] }`. Server, in order:
   1. tenant exists, active, `onlineBookingEnabled` → else 404 / 403 `ONLINE_BOOKING_DISABLED`;
   2. outlet belongs to the merchant and is active → else 404;
   3. validation (zod): 1–30 items, quantity 1–99, products of this merchant stocked at that outlet, days valid
      (pickup ≥ today VN, return ≥ pickup, ≤ 365 days ahead), phone normalised → else 400;
   4. rate limit: ≤ 5 requests / 10 min per IP and ≤ 3 pending requests per phone per merchant → 429
      `TOO_MANY_BOOKING_REQUESTS`;
   5. availability for every item at that outlet over [pickup, return] using the same rules as order creation
      (`apps/api/lib/availability.ts`, schedule-conflict check), regardless of the shop's overlap setting →
      if any item is short: 409 `BOOKING_ITEMS_UNAVAILABLE` with `data.items: [{ productId, name, available,
      requested }]`; nothing stored;
   6. store the request (status `PENDING`) with a snapshot per item: name, pricing type and unit price from the
      default option, quantity, line amount (DAILY: price × qty × days, days counted like the cart; FIXED:
      price × qty), and the subtotal;
   7. notify (rule 9); answer 201 `{ id, status }` only — no shop-internal data, no echo of other requests.
6. Out of stock → the cart shows which item/day is short, with "Gọi shop" / "Hỏi qua Zalo". Success → "Đã gửi
   yêu cầu đặt thuê. <Shop> sẽ gọi hoặc nhắn Zalo để xác nhận. Hàng chưa được giữ…"; the cart is cleared.
7. The product detail sheet (#665) keeps "Gọi shop" / "Hỏi thuê qua Zalo" and gains "+ Đặt thuê" when enabled.

### Data

8. New models (additive migration):
   - `BookingRequest` — id, merchantId, outletId, status (`PENDING` | `CONFIRMED` | `REJECTED` | `EXPIRED`),
     customerName, customerPhone, note?, pickupDate (VN day key), returnDate, subtotal, createdAt, handledAt?,
     handledById?, rejectReason? (`OUT_OF_STOCK` | `UNREACHABLE` | `CUSTOMER_CANCELLED` | `OTHER`),
     rejectNote?, orderId? (unique, set on confirm), customerId? (set on confirm), ip?; indexes (merchantId,
     status, createdAt), (outletId, status).
   - `BookingRequestItem` — id, requestId, productId, productName, pricingType, unitPrice, quantity, amount.
   - `Merchant.onlineBookingEnabled Boolean @default(false)`.

### Notifications

9. On create: a `Notification` row + push (existing `push-notifications.ts`) for the merchant's MERCHANT users and
   the outlet's users (all outlet roles) — type `BOOKING_REQUEST`, title "Yêu cầu đặt mới", body
   "<Tên> đặt <n> món · <dd/MM> → <dd/MM>", data all strings `{ type, requestId, outletId }`, no `orderId`.
   Tapping opens the request detail in new apps; old apps show a neutral row (check, as for `SHIFT_CHANGED`).

### Shop side — API (auth, `with*Auth`; scope: MERCHANT all outlets, outlet roles their outlet)

10. `GET /api/booking-requests?status=PENDING|CONFIRMED|REJECTED|EXPIRED&outletId&page&limit` (default PENDING
    first, newest first) → items `{ id, status, customer{name, phone, existingCustomerId?}, outlet{id, name},
    pickupDate, returnDate, itemCount, subtotal, createdAt, waitingMinutes, handledAt?, orderId?, orderNumber?,
    rejectReason? }` and `pendingCount`.
11. `GET /api/booking-requests/[id]` → the request + items + `existingCustomerId` (customer of this merchant with
    the same normalised phone, if any) + a fresh availability check per item `{ productId, available,
    requested, ok }` and `checkedAt`.
12. `POST /api/booking-requests/[id]/check` → the same availability block only (the ↻ Kiểm lại button).
13. `POST /api/booking-requests/[id]/reject` `{ reason, note? }` → status REJECTED (only from PENDING; else 409
    `BOOKING_REQUEST_ALREADY_HANDLED` with `data.status`, `data.orderNumber?`, `data.handledBy`).
14. **Confirm = create the order through the normal path.** `POST /api/orders` accepts an optional
    `bookingRequestId` (additive). In the same transaction as the order insert: the request must be PENDING and
    belong to the same merchant/outlet → set CONFIRMED, `orderId`, `customerId`, `handledAt/By`; else 409
    `BOOKING_REQUEST_ALREADY_HANDLED` and no order is created. All existing order validation, schedule-conflict and
    stock rules apply unchanged. Exactly one order per request (unique `orderId` + status guard).
15. Expiry: a PENDING request whose `pickupDate` is before today (VN) becomes EXPIRED — applied lazily on list /
    detail reads (one `updateMany`), like attendance auto-close; no cron.
16. Pending count for badges: `GET /api/booking-requests/count` → `{ pending }` (also usable by Home / Việc cần làm).

### Shop side — apps (iOS reference, Android same) and web

17. Đơn hàng gets a **"Chờ xác nhận · N"** segment/tab (only when the setting is on or N > 0). Rows: name, phone,
    branch, days, items summary, waiting time ("chờ 5 phút"; red when > 2 h). Home / Việc cần làm show
    "N yêu cầu chờ xác nhận" when N > 0. Handled requests (confirmed / rejected / expired) are listed below, dimmed.
18. **Request detail**: customer (Gọi / Zalo; "Khách mới" when no existing customer), "Nhận đồ tại" branch, days,
    items table with per-item stock label ("còn 3" / "Hết · 0/1"), "Kiểm lúc HH:mm" + **↻ Kiểm lại** (app also
    pull-to-refresh), subtotal, note, buttons **Từ chối** / **Xác nhận**.
19. **Xác nhận** opens the cart (app) / create-order form (web) pre-filled: existing customer (or a new customer
    from name + phone, created when the order is saved), outlet, pickup/return, lines with the snapshot pricing
    type and unit price, note; banner "Từ yêu cầu đặt của <tên> · <ngày>". Staff may change anything (incl. per-day
    vs per-time, prices, deposit, collateral, discount). If the cart already has lines: "Giỏ đang có N món. Thay
    bằng yêu cầu này?" (no merge). Leaving without saving keeps the request PENDING. Saving sends
    `bookingRequestId` (rule 14). On 409 show "Yêu cầu đã được xác nhận bởi … (#mã)".
20. After the order is created: success screen with "Nhắn Zalo cho khách" (opens Zalo with a prefilled text: shop
    name, order number, items, pickup day, branch address, deposit) and "Xem đơn". Reject screen: reason radio +
    note; after rejecting, the same Zalo button with a reject text. Nothing is sent automatically.
21. Push tap / inbox row of type `BOOKING_REQUEST` opens the request detail.

### Roles

22. MERCHANT: all requests of the merchant; setting. OUTLET_ADMIN / OUTLET_STAFF / OUTLET_INVENTORY: requests of
    their outlet (view, check, reject, confirm — confirm still needs the normal order-create permission and price
    rules, e.g. OUTLET_STAFF cannot edit prices). Another merchant's request → 404.

### Errors (5 locales)

23. `ONLINE_BOOKING_DISABLED`, `BOOKING_ITEMS_UNAVAILABLE`, `TOO_MANY_BOOKING_REQUESTS`,
    `BOOKING_REQUEST_ALREADY_HANDLED`, `BOOKING_REQUEST_NOT_FOUND`.

## Out of scope

Sale orders, online deposit/payment, stock hold while pending, customer accounts / tracking page, automatic SMS /
Zalo messages to customers, pricing-mode choice by customers, a paid add-on.

## API and data

New: models in rule 8; public `POST /api/public/[tenantKey]/booking-requests`; shop routes 10–16; additive
`outletId` filter + `defaultPricing` on the public products route; additive `bookingRequestId` on `POST /api/orders`;
push type `BOOKING_REQUEST`. Nothing removed or retyped; old apps never call the new routes.

## Acceptance

- [ ] Each rule has a test (unit / route / business e2e), both TZ; VN day boundary at 16:59:59Z / 17:00:00Z for
      pickup ≥ today and expiry.
- [ ] Old iOS / Android (`release-2026-10-12.2` and current `main-real`): a `BOOKING_REQUEST` notification does not
      crash or open a wrong order (file:line); order lists unchanged.
- [ ] Public routes: tenant isolation, rate limit, disabled shop → 403, out-of-stock → 409 without storing.
- [ ] Concurrency: two confirms of one request → one order; two submits at the same time are both stored (no hold).
- [ ] Visible checks: public page phone + desktop (Chrome), app (Simulator, emulator), web shop.
