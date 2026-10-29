# Web reads the shop currency again while the tab stays open

Issue: #1321 (epic #1309) · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-29

## Problem

Web takes the shop currency only from the login payload (`apps/client/app/components/ClientLayout.tsx`). `refreshUser` uses
`GET /api/users/profile`, which has no `currency`, so the old value is kept. When the owner changes the currency on the
phone or on another web, staff on web see the old currency until they log out and in.

## Proposed outcome

- Web reads `GET /api/settings/currency` (every role can read) on page load and when the tab returns to the foreground,
  at most once per minute, and redraws every price without a reload.
- ADMIN / OPS web (no merchant): no call.

## Affected users and systems

OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY (and MERCHANT on a second tab) on web. `apps/client`, `packages/hooks`. No API change.

## Constraints

- Prefer no API change. Currency stays the shop-wide `Merchant.currency`; only the owner changes it (not touched here).
- Simple: one pure decision function, one small effect component.

## Open questions

- None.

## Decision log

- 2026-10-29 — owner: use the existing `GET /api/settings/currency`; profile gets no new field (issue #1321).
