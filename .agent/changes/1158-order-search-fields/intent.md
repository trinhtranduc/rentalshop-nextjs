# Order search by name, phone, or order number

Issue: #1158 · Author: owner · Status: accepted · Created: 2026-10-21

## Problem

The order search box matches the customer name, the phone, the order number, and also the names of items on the order. A search for a person can list orders that only share a product name.

## Proposed outcome

`GET /api/orders?q=` matches only the customer name, the customer phone, and the order number. The hint on the shop web, iOS, and Android says that.

## Affected users and systems

Every role that can open the order list. Apps: api (`packages/database` search used by `GET /api/orders`), client, iOS, Android.

## Constraints

Merchant scope stays. Customer-name matching stays accent-insensitive. The response shape does not change. Installed apps keep sending `q` and receive fewer rows when the text only matched a product name.

## Open questions

None.

## Decision log

- 2026-10-21 — Search only name, phone, or order number (owner).
