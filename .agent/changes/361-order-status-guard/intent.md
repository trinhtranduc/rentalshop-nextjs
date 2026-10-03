# Order status guard and scope; top products without cancelled; sale deposit 0

Issue: #361 · Author: Trinh Tran · Status: accepted · Created: 2026-10-03 · Part of #362 (PR 1)

## Problem

- `PATCH /api/orders/:id/status` takes any status from any status and has no merchant/outlet scope check (IDOR).
- `PUT /api/orders/:id` writes `status` without a transition check; MERCHANT users skip the merchant check when
  they send `outletId` equal to the order's outlet.
- `analytics/period` top products count CANCELLED orders.
- SALE orders store client deposits although a sale is paid in full at creation.

## Proposed outcome

Only valid transitions are written; other changes get 400 `INVALID_ORDER_STATUS`. Orders outside the caller's
merchant/outlet get 403 on both routes. Top products exclude CANCELLED. SALE orders store deposit 0.

## Affected users and systems

All merchant roles; api, packages/constants, packages/utils; web (PATCH), iOS and Android (PUT).

## Constraints

- Every transition the installed apps trigger stays allowed; same status = no-op; error shape unchanged.
- No migration, no response field change.

## Decision log

- 2026-10-03 — A PICKUPED rental can be cancelled (Trinh Tran)
- 2026-10-03 — Reuse `INVALID_ORDER_STATUS` (iOS already maps it) instead of a new code
- 2026-10-03 — Keep legacy SALE RESERVED→COMPLETED (Android offers it for old data)
