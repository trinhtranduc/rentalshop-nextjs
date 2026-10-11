# Three small API fixes: deleted order by id, blank barcode, top customers collateral

Issues: #739, #742, #506 · Author: Trinh Tran · Status: in progress · Created: 2026-10-10

## Problem

- #739: `GET /api/orders/:id` returns an order that "Xoá đơn" soft-deleted. List, search and by-number already answer 404.
- #742: the web (and old iOS `createProduct`) sends `"barcode": ""`. The API stores `''`; the unique index `(merchantId, barcode)` then 409s the second product without a barcode.
- #506: `topCustomers[].totalSpent` of `GET /api/analytics/period` counts collateral (securityDeposit) as spending; the Overview headline does not (#484).

## Proposed outcome

- A deleted order is 404 `ORDER_NOT_FOUND` by id, like by number.
- A blank barcode is stored as NULL on create and update, existing `''` rows become NULL (data migration), a real duplicate is still 409 `DUPLICATE_ENTRY`.
- `totalSpent` = rent paid; collateral is never spending.

## Affected users and systems

MERCHANT, OUTLET_ADMIN (api, web, iOS, Android). Tables: `Order` (read), `Product` (data migration).

## Constraints

No field added, removed or retyped. Old apps keep working (see the API compatibility table of the PR).

## Decision log

- 2026-10-10 — one PR, three fix commits; split only if one is risky (owner).
