# Admin dashboard subscription tiles filter the list; merchant product checkboxes

Issue: #1180 · Author: owner · Status: accepted · Created: 2026-10-24

## Problem

On the admin dashboard, Trial / Active / Expiring Soon / Expired / Cancelled tiles either go to `/subscriptions` with no filter, or to `?status=TRIAL` while the subscriptions page never reads `status`, so the list is always unfiltered.

On Products, bulk-select checkboxes show. Opening a merchant’s product list (`/merchants/[id]/products`, class `ar-detail`) the checkboxes collapse because `details.css` sets `min-width: 0` on every descendant.

## Proposed outcome

Clicking Trial shows only TRIAL rows; Active → ACTIVE; Cancelled → CANCELLED. Expiring Soon → period end in the next 7 days; Expired → period end already passed. Merchant product list shows the same row checkboxes as the all-products list.

## Affected users and systems

Roles: ADMIN, OPS. Apps: admin, api (`GET /api/subscriptions` additive `bucket`). Packages: database search where, utils subscriptions client, hooks. No iOS/Android list callers.

## Constraints

Dual IDs unchanged. PRs to `dev`. Additive API only: omit `bucket` = old list. `status` still the DB enum (uppercased). Installed apps call `GET /api/subscriptions/status`, not the admin list.

## Open questions

None. Owner asked to check and fix both bugs.

## Decision log

- 2026-10-24 — Expired / Expiring Soon match the dashboard tiles (period end), not `status=EXPIRED`. (`bucket=expired|expiring`)
