# Web UI refresh: orders, products, users, customers, settings

Issue: #356 · Author: Trinh Tran (with Claude) · Status: accepted · Created: 2026-10-03

## Problem

Main merchant web screens were hard to read on a till and on phones, mixed English and Vietnamese,
and several hid real bugs: lost product prices on create, a password change aimed at the wrong user,
customer page without actions, cleared customer fields not saved, menu items that closed before running,
a 403 for outlet admins when adding a user, and merchants with no product link or referral code.

## Proposed outcome

- One layout across screens: main column + 18rem side column; dialogs for quick edits (user, customer);
  cards instead of tables below `md`.
- Every visible string comes from `locales/{en,vi}`.
- The bugs listed in #356 are fixed and checked in a browser (Playwright + axe, 1440 and 390 wide).

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on `client`. API: orders list date filter, outlet-operations,
login response and `GET /merchants/:id` (fill a missing `tenantKey`). No schema change. No mobile change.

## Constraints

- Installed iOS/Android apps keep working: no response shape removed; `/api/orders` with `YYYY-MM-DD`
  now means the Vietnam civil day (iOS sends device-local `yyyy-MM-dd`, which in Vietnam is that day).
- No migration.

## Open questions

- Currency switches with the UI language when the Business tab opens (since f4d16a21). Keep or drop?
- Accent-insensitive customer search ("nguyen" → "Nguyễn") is not met by the API.

## Decision log

- 2026-10-02 — Rental days count pickup and return day (owner).
- 2026-10-02 — Pricing method stays a per-item choice on create order (owner).
- 2026-10-02 — On create, a rental collects the deposit; a sale collects the order total (owner).
- 2026-10-03 — Product create/edit/view share the Shopify-style layout (owner chose option A).
- 2026-10-03 — User and customer add/edit use dialogs; view is a page (owner).
- 2026-10-03 — Referral code and product link must always exist: fill a missing tenantKey (owner).
