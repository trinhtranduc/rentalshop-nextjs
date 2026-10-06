# Shop setting "Cho tạo đơn khi trùng lịch" (allow overlapping orders)

Issue: #518 · Author: Claude (for trinhduc20) · Status: in progress · Created: 2026-10-06

## Problem

The API never checks availability when a rental is saved. The apps only warn, so a shop can book the
same dress to two customers on the same day. Some shops want the server to refuse that; others rely on
today's "warn only" behaviour (they keep stock loosely or over-book on purpose).

## Proposed outcome

- A per-shop setting `allowOverlappingOrders`, default `true` (= today: no check on save).
- When the owner turns it off, the API rejects a RENT order (create, or an edit that changes dates,
  quantities, items or outlet, or a change that makes it active again) when on some Vietnam civil day
  the units already held by other active rentals at that outlet plus the requested units exceed the
  outlet stock. Answer `409 ORDER_SCHEDULE_CONFLICT` with the products, days and blocking orders.
- Installed apps call the same endpoints, so they are blocked too and show the server message.

## Affected users and systems

`MERCHANT` (owner, changes the setting; `ADMIN` may too), all order-creating roles, `api`, iOS and
Android (later PR reads the flag and the error), `Merchant` table.

## Constraints

- Default ON must keep create/update exactly as today and run no extra queries.
- Additive API only (installed apps). VN civil days, inclusive of pickup and return day.
- SALE orders are never checked. Cancelled / returned / deleted orders never hold stock.

## Open questions

- Products with no `OutletStock` row count as stock 0 (rejected when the setting is off).

## Decision log

- 2026-10-06 — Store as a `Merchant` column, not in `pricingConfig.businessRules` (pricing PUT rebuilds it).
- 2026-10-06 — Only role `MERCHANT`/`ADMIN` may change it, even if a custom role has `merchant.manage`.
