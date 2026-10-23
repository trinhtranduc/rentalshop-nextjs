# Public shop: hide prices; booking without stock check

Issue: #1174 · Author: Trinh · Status: in-progress · Created: 2026-10-23

## Problem

On the public catalog, guests still see Còn/Hết and cannot send a booking when an item is full (409). Shops cannot hide prices; the catalog always shows rent/sale/deposit.

## Proposed outcome

A shop setting (default on) hides public prices and the APIs omit them. Guests pick dates and send a booking without a stock check. Image search never shows Còn/Hết. Confirming into an order still uses the shop overlap rules.

## Affected users and systems

Public visitors on `/{tenantKey}/products`. Shop owners on web Settings → Trang shop công khai. API public products, image search, booking-requests. Merchant column `showPublicPrice`. Not iOS/Android settings.

## Constraints

Additive column default true. Installed apps do not call `/api/public`. Optional settings field. No change to `allowOverlappingOrders`. 12 public languages for “Liên hệ”.

## Open questions

None — owner asked to implement and PR to `main-real`.

## Decision log

- 2026-10-23 — One issue for both TODO bullets (owner). Web-only setting. Booking POST no longer 409s for stock; shop decides at confirm (owner).
