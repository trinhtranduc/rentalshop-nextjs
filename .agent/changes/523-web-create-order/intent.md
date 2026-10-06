# Intent — #523 Shop web Tạo đơn (+ Sửa đơn)

Issue: #523 · Phase 4 of the shop web redesign (plan: https://claude.ai/code/artifact/a221f242-a006-49f4-bdc0-aa7a2624f348)

## What

Redraw `/orders/create` of the shop web (`apps/client`) to the approved board `Tao-don`: the rental days first, a product grid that shows how many units are still free for those days ("Còn n/m"), and the cart on the right. `/orders/[number]/edit` uses the same screen with the order loaded.

## Why

At the counter the first question is "do I still have it for those days?". The old form asks for products before the days and only checks stock for what is already in the cart.

## Constraints

- UI only. Reuse the existing calls: `GET /api/products`, `GET /api/categories`, `POST /api/products/batch-availability`, `GET/POST /api/customers`, `GET /api/outlets`, `POST /api/orders`, `PUT /api/orders/[id]`, loyalty summary / validate / earn. No API change.
- Same pricing rules as today (`@rentalshop/utils` order-line pricing, inclusive Vietnam rental days), same payload fields, same edit rule (rent `RESERVED`, sale `COMPLETED`; type locked).
- Days are Vietnam civil days (`Asia/Ho_Chi_Minh`).
- Admin keeps the old `CreateOrderForm`; nothing in `packages/ui` changes.
- New strings in `locales/{en,vi}/orders.json` under `web.editor`.
