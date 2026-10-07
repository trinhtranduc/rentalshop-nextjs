# Intent — #516 Shop web Đơn hàng + Chi tiết đơn

Issue: #516 · Phase 3 of the shop web redesign (plan: https://claude.ai/code/artifact/a221f242-a006-49f4-bdc0-aa7a2624f348)

## What

Redraw the order list (`/orders`) and the order page (`/orders/[number]`) of the shop web (`apps/client`) to the approved boards `Don-hang` and `Chi-tiet-don`.

## Why

The shop owner reads the list to know what to do next (hand over, take back, call a late customer, collect money) and the order page to do it. The old screens show raw columns and hide the money left to collect.

## Constraints

- UI only. Reuse the existing calls: `GET /api/orders`, `GET /api/orders/by-number/[n]`, `GET /api/analytics/outlet-operations`, `PATCH /api/orders/[id]/status`, `PUT /api/orders/[id]`, `GET /api/orders/export`. No API change in this phase.
- Days are Vietnam civil days (`Asia/Ho_Chi_Minh`).
- Admin keeps the old `OrderDetail`; only additive exports in `packages/ui`.
- Multi-select export waits for phase 5 (the export route ignores `orderIds` today).
- New strings in `locales/{en,vi}/orders.json` (the only locales the `orders` namespace has).
