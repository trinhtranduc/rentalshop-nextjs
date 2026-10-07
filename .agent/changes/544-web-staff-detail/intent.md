# Intent — #544 Thêm nhân viên and staff detail on the shell

Issue: #544 · Author: agent (for Trinh Tran) · Status: accepted · Created: 2026-10-06

## Problem

`/users/add` and `/users/[id]` are the last staff screens on the old light-only UI (shared `UserForm`,
`UserInfoCard`, `UserAccountPanel`, shadcn dialogs, "Người dùng" breadcrumbs). In dark mode they stay
white; the Nhân viên list (#528) already uses the new shell.

## Proposed outcome

Both pages on the `ar-*` tokens (light + dark, 390px), Vietnamese copy, same fields, rules and API calls.
Owner: "redraw every page still on the old UI, following the design system; many issues, many PRs".

## Affected users and systems

MERCHANT, OUTLET_ADMIN (OUTLET_STAFF: no-access note). `apps/client` only.

## Constraints

- UI only. Calls: `usersApi.createUser`, `getUserById`, `updateUserByPublicId`, `changePassword`,
  `activateUser`, `deactivateUser`, `deleteUser`; `outletsApi.getOutlets`. No API, no `packages/**` change.
- Keep the rules: role choices per caller (merchant and outlet admin: Quản lý chi nhánh / Nhân viên, as the
  old RoleSelect and the API's `canAssignRole`), outlet picked by the merchant and fixed for an outlet admin,
  role read-only when editing (as before), password ≥ 6 + confirm, lock / unlock, delete with confirm.
  Scope is enforced by the API; the UI only hides.
- No separate edit route exists; edit stays a dialog over the detail page.

## Open questions

- None blocking. Platform ADMIN creating MERCHANT / ADMIN users is an admin-app task; the shop web only
  offers outlet roles (ADMIN does not use the shop web).

## Decision log

- 2026-10-06 — split from #542 (permission pages, bug first) (agent).
