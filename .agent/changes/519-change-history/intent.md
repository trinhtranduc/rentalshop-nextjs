# Readable change history for orders and products

Issue: #519 · Author: Claude (for trinhduc20) · Status: in progress · Created: 2026-10-06

## Problem

The mobile canvas boards LS-don and LS-san-pham show a "Lịch sử thay đổi" list for an order and for a
product. The API only has raw audit logs (`/history`) that
- are not scoped: any user with `orders.view` / `products.view` can read another merchant's history;
- leak user email, IP and user agent, and full snapshots;
- cannot render the board: order totals are stored as `[REDACTED]`, product prices, pricing options,
  per-outlet stock and images are never recorded, Dates/arrays always look changed, and pickup, return,
  cancel and payments through the status/payment routes are not recorded at all.

## Proposed outcome

- `GET /api/orders/{id}/changes` and `GET /api/products/{id}/changes` return a ready-to-render list
  (kind, actor name + role, field changes old → new, item lines, note), plus `total` and `latestAt`.
- New audit rows carry normalised snapshots so the diff is meaningful. Old rows degrade to a generic entry.
- `/history` is scoped to the caller's merchant (outlet for outlet roles); its shape does not change.

## Affected users and systems

MERCHANT, OUTLET_ADMIN, OUTLET_STAFF (read); ADMIN/OPS (read all). API only. iOS/Android UI follows later.

## Constraints

- Installed apps must keep working: additive only. No old app calls the order/product `/history`.
- No schema change (AuditLog already exists). Audit paths never throw.
- No emails, IPs or `[REDACTED]` values in `/changes`. Staff never see `costPrice`.

## Open questions

- Product edits by the owner carry no `AuditLog.outletId`, so staff do not see them under the literal
  "only their outlet's rows" rule.

## Decision log

- 2026-10-06 — read-only, no undo; one entry per audit row; the app groups by Vietnam civil day.
