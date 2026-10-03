# Product edit resets rented stock; order item edit drops the product snapshot

Issue: #359 · Author: Trinh Tran · Status: accepted · Created: 2026-10-03

## Problem

1. `PUT /api/products/:id` with `outletStock` rebuilt OutletStock with `deleteMany` + `create`, `renting: 0`,
   `available: stock`. A product edit while units were rented made them look free (double booking) and deleted
   the rows of outlets missing from the payload.
2. `updateOrder` re-created order items without `productName`, `productBarcode`, `productImages`, so the item
   lost its snapshot and later depended on the live product.

## Proposed outcome

1. A product edit keeps each outlet's `renting`, sets `available = stock − renting`, keeps other outlets' rows,
   and rejects `stock < renting` with 400 `STOCK_BELOW_RENTED`.
2. Re-created items carry the snapshot from the product, or the old snapshot when the product cannot be loaded.

## Affected users and systems

All roles that edit products or orders; api, packages/database; read by client, iOS, Android.

## Constraints

- Installed apps keep working: same request and response shape. The new error has an English message and
  `{success, code, message, error}`.
- No migration. Hotfix off `main-real` (production; it equals `dev` after #358), PR to `main-real`, then merge back into `dev`.

## Decision log

- 2026-10-03 — Hotfix both bugs before the mobile API work (Trinh Tran)
