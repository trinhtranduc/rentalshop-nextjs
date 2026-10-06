# Spec — Readable change history

Issue: #519 · Status: in progress · Intent: ./intent.md

## Behavior

1. `/api/orders/{id}/history` and `/api/orders/{id}/changes` return 404 `ORDER_NOT_FOUND` unless the
   order belongs to the caller's merchant; OUTLET_ADMIN/OUTLET_STAFF only for orders of their outlet.
   ADMIN/OPS see all.
2. `/api/products/{id}/history` and `/changes` return 404 `PRODUCT_NOT_FOUND` unless the product belongs
   to the caller's merchant. On `/changes`, outlet roles only get rows whose `AuditLog.outletId` is theirs.
3. `/history` keeps its old response shape for authorized callers.
4. `/changes` returns `{ success, code, data: { entries, total, latestAt } }`, newest first, `limit`
   (≤100, default 50) / `offset`. Each entry: `id, at, kind, actor {name, role} | null,
   changes [{field, from, to}], items [{productId, name, field, from, to, unit?}],
   note? {text, imagesAdded, imagesRemoved}`. No email, IP, user agent or `[REDACTED]` value.
5. Kind is chosen from the change (status → picked up / returned / cancelled / completed; deposit; note;
   items; item price; product price / stock / images; otherwise edited). Old rows never throw.
6. New rows: order snapshots include dates, totals, deposits, discount, notes + note image count,
   status and items; `totalAmount` is no longer redacted. Product snapshots include name, prices,
   deposit, pricing options, per-outlet stock, images, category, barcode, isActive; never `costPrice`.
7. Status changes through `PATCH /orders/{id}/status`, order payments through `/payments/process`,
   order restore, and product create/update/delete/restore each record a row.

## Out of scope

Mobile UI, undo/revert UI, schema changes, backfilling old rows.

## API and data

New: two GET routes. Changed: scope on two GET routes; AuditLog `details` content for new rows.
Ids are the numeric public ids.

## Acceptance

- [x] Unit tests for the diff builder (every kind, old rows, Date/array noise)
- [x] Route tests for scope and response shape, under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [x] No new i18n codes (reuses `ORDER_NOT_FOUND`, `PRODUCT_NOT_FOUND`, `AUDIT_LOG_RETRIEVED_SUCCESS`)
- [x] iOS/Android: no change now (new endpoints; UI later)
