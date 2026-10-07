# Clearer Overview money, rented-out list, store info screen

Issue: #484 · Author: Trinh (with Claude) · Status: accepted · Created: 2026-10-05

## Problem

- Overview's headline "revenue" does not say whether it is money collected or order value, and the
  top-products amounts use order value, so one screen shows two "revenue" meanings.
- Late fees collected at return (`order.lateFee`) never reach collected money: `getOrderRevenueEvents`
  adds `damageFee` only. Reports are lower than the cash the shop received.
- Overview has no orders chart.
- "Đang cho thuê" / "trễ hạn trả" on Overview open the generic orders tab.
- Store info (edit store) on iOS/Android still uses the old form UI.

## Proposed outcome

Matches the design canvas "AnyRent mobile – bản đã chốt" (boards `Tong-quan`, `Tong-quan-giai-thich`,
`DT-dang-thue`, `CH-sua`). See `spec.md`.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android; `GET /api/analytics/period`;
`packages/utils` revenue calculator (also used by web income reports).

## Constraints

- Additive API only. Installed apps keep decoding `/api/analytics/period`.
- Cancelled orders stay out of revenue. Days are Vietnam civil days.

## Open questions

- None.

## Decision log

- 2026-10-05 — Owner asked to implement the canvas changes ("update giúp tôi các thay đổi trên") (Trinh)
- 2026-10-06 — "Tiền đã thu" leaves collateral out ("giúp tôi đổi", answering the collateral question) (Trinh)
- 2026-10-05 — Late fee counts as collected money at return, like damage fee (Claude, from `order-money.ts`)
