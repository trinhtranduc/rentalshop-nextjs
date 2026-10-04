# API phase 8 — list money fields, nearest-task sort, planned ranges, product soft delete

Issue: #389 (part of #385, feeds #390 and the #401 gaps) · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The new mobile screens (#371, #374, #401) need data the API does not return yet:

- Tất cả đơn and search rows cannot show "còn thu / trả cọc / đã thu đủ": `GET /api/orders` rows have no
  `amountDue` / `refundDue` (only the outlet-operations rows do, #362).
- The Loc sheet has a "Việc gần nhất" sort and planned-date ranges; the API sorts only by single columns and
  filters dates only by `createdAt` / `pickedUpAt` / `returnedAt` / `updatedAt`.
- Calendar day rows (`GET /api/calendar/orders/by-date`) cannot show "còn thu" or the late fee.
- Product detail needs "Xóa". `DELETE /api/products/{id}` hard-deletes, even when the product is on orders still
  being reserved or out on rent, and the web product detail page shows "deleted" even when the API refuses.

## Proposed outcome

- `GET /api/orders` rows carry `amountDue` and `refundDue` (same rule as `computeOrderBalance`).
- `GET /api/orders?sortBy=nearestTask` lists late tasks first, then the nearest planned pickup/return, then closed orders.
- `GET /api/orders?dateField=pickupPlanAt|returnPlanAt&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` filters planned dates
  by Vietnam civil days.
- Calendar by-date rows carry `amountDue`, `refundDue`, `lateFee`.
- `DELETE /api/products/{id}` soft-deletes (`deletedAt`), returns 409 `PRODUCT_HAS_OPEN_ORDERS` while the product is on a
  RESERVED or PICKUPED order, and deleted products disappear from lists, search, availability and the home list.
  Orders keep showing the product.

## Affected users and systems

All merchant roles; `api`, `client` (product detail delete), iOS + Android error tables; `Product` model (new nullable column).

## Constraints

- Additive only. Installed iOS/Android builds (from `main-real`) must keep working. Defaults unchanged.
- Day logic in Vietnam civil days (`timezone-dates`).
- Never edit an applied migration.
- Query cost bounded: payments are read per page, only the fields the balance needs.

## Open questions

- None blocking. Soft-deleted products keep their barcode (unique column); re-creating a product with the same
  barcode is refused. Recorded as a known limit.

## Decision log

- 2026-10-04 — Scope = issue #389 plus the #401 list gaps (`amountDue`/`refundDue`, `nearestTask`, planned ranges) (owner, via plan Wave 3a)
- 2026-10-04 — `Product.deletedAt` does not exist: add a new additive migration (agent, per `db-migration`)
- 2026-10-04 — Batch delete follows the same soft-delete + open-order rule, so the two delete paths agree (agent)
