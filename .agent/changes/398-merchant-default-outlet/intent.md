# A merchant without an outlet cannot create an order

Issue: #398 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-04

## Problem

A MERCHANT login has no `outletId` in its scope. iOS and Android send `POST /api/orders` without
`outletId`, so zod coerces `undefined` to `NaN` and the API answers 400 `VALIDATION_ERROR`
("outletId: Expected number, received nan"). The apps show "Input validation failed". Rent and sale
both fail for every merchant owner on the POS apps, including builds already installed. Found by the
e2e run (#395).

## Proposed outcome

When the caller is a MERCHANT and the body has no `outletId`, `POST /api/orders` creates the order on
the merchant's default outlet (`Outlet.isDefault`, active, same merchant). With no default but exactly
one active outlet, it uses that outlet. Otherwise it answers 400 `OUTLET_REQUIRED` with a translated
message.

## Affected users and systems

- Roles: `MERCHANT` (fixed). `OUTLET_ADMIN`, `OUTLET_STAFF`, `ADMIN` unchanged.
- Apps: `api`; iOS and Android benefit without an update. Web client already sends `outletId`.
- Data: `Outlet.isDefault`, `Outlet.isActive` (already in the schema, no migration).

## Constraints

- Additive only. Installed apps keep working and start succeeding.
- Outlet roles keep their own outlet. An explicit `outletId` still wins and is still scope-checked (403
  for another merchant's outlet).
- Other mobile-used routes that need an outlet are fixed the same way only if they fail the same way.

## Open questions

- None. The owner decided the fallback.

## Decision log

- 2026-10-04 — Fall back to the merchant's default outlet, then the only active outlet, else
  `OUTLET_REQUIRED` (owner, issue #398)
