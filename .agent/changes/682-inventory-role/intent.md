# Nhân viên kho — staff who also manage products and categories

Issue: #682 · Author: agent (for Trinh Tran) · Status: accepted · Created: 2026-10-09

## Problem

Shops want one person who sells like a staff member and also runs the stock: adds, edits and deletes
products and categories, imports and exports the product Excel. Today the only way is `OUTLET_ADMIN`,
which also opens revenue, staff management, order delete and outlet settings.

## Proposed outcome

- A new role `OUTLET_INVENTORY` ("Nhân viên kho" / "Inventory staff").
- It can do everything `OUTLET_STAFF` can, in the same outlet scope, with money hidden the same way
  (no revenue, no reports beyond what staff sees, no change history).
- Plus full product management like `OUTLET_ADMIN`: create, edit (prices and cost price included),
  delete, restore, import and export products; create, edit and delete categories.
- `MERCHANT` and `OUTLET_ADMIN` can give the role on the web and in both apps.
- New iOS and Android builds show the product and category controls for it and hide money like staff.

## Affected users and systems

New role `OUTLET_INVENTORY`; `MERCHANT`, `OUTLET_ADMIN` (assign it); `ADMIN` / `OPS` (see it in admin).
`prisma` (enum value), `packages/constants|types|utils|auth`, `apps/api`, `apps/client`, `apps/admin`,
iOS, Android, `locales/*`, seed and e2e.

## Constraints

- Additive only. `ADMIN`, `OPS`, `ARTICLE`, `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` keep exactly their
  current permissions and scope.
- Outlet scope and money hiding are enforced in the API; UI only hides controls.
- Installed apps (`main-real`): old iOS reads the new role as staff (`User.swift:49`), so it keeps working
  without product edit. Old Android reads it as `UNKNOWN` (`PermissionManager.kt:15-20`) and loses order
  update and customer/product add. So the role cannot be assigned until both new app versions are in
  the stores (flag `inventoryRole`, off by default); then those users must update.
- Migration: one `ALTER TYPE "UserRole" ADD VALUE`, never edit an applied migration.

## Open questions

- `OUTLET_ADMIN` can create categories but the API refuses edit/delete while the web shows the buttons.
  Asked; the owner's answer was about the new role. Not changed here; kept as found.

## Decision log

- 2026-10-09 — A new enum role, not staff + per-user permission, accepting that old Android cannot use it (owner)
- 2026-10-09 — Full product rights like `OUTLET_ADMIN`: prices and cost price (owner)
- 2026-10-09 — Product Excel import and export allowed (owner)
- 2026-10-09 — Revenue hidden, otherwise the same as staff (owner)
- 2026-10-09 — Name `OUTLET_INVENTORY`, matches the `OUTLET_*` outlet-scoped roles (agent)
- 2026-10-09 — Role on by default, no flag to set; `INVENTORY_ROLE_ENABLED=false` stays as the kill switch. Accepted: a user given the role on an old Android build cannot update orders until the app updates (owner)
