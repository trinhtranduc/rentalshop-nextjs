# Overview top products count sale lines as rentals

Issue: #429 · Author: Trinh Tran · Status: approved · Created: 2026-10-05

## Problem

The Overview "Top Products" card (iOS, Android, web dashboard) shows "N rentals" under each product.
`rentalCount` counts every order line of the product, whatever the order type, so product 15 shows
"1 rentals" from a single SALE order. Found in the #391 e2e run.

## Proposed outcome

`rentalCount` counts only lines of RENT orders (CANCELLED still excluded). Sale lines get their own
`saleCount` (new, additive). The ranking itself (by revenue, RENT and SALE, CANCELLED excluded) stays.

## Affected users and systems

- `GET /api/analytics/overview` and `GET /api/analytics/period` → `buildAnalyticsPeriodReport`
  → `computeTopProducts` (iOS and Android Overview, web dashboard "Top Products" card).
- `GET /api/analytics/top-products` → `computeTopProductsByShop` (admin top products, iOS "see all").

## Constraints

- No field removed or retyped; `saleCount` is additive. Merchant/outlet scoping unchanged.
- Failing test first (`bug-fix-tdd`).

## Decision log

- 2026-10-05 — Fix the count, not the ranking: the card is "Top Products" ranked by revenue over
  both order types (vi web label "Sản phẩm bán chạy"); dropping SALE lines from the ranking would hide
  sales revenue. A sale-only product now shows "0 rentals". The issue asked whether sales need their own
  count: yes, `saleCount`, so clients can show it later.
- 2026-10-05 — Web dashboard shows "N rentals · M sales" for each product (it showed `rentalCount` as
  "N orders"), reusing the existing `charts.rentals` / `charts.sales` keys. Mobile UI unchanged
  (it already labels the number "rentals").
