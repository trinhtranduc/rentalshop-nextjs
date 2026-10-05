# Admin moves a user account to another merchant

Issue: #443 · Author: Trinh Tran (agent) · Status: draft · Created: 2026-10-05

## Problem

A system ADMIN sometimes has to move a user account to another merchant (wrong merchant at sign-up, a
staff member who changed shop) and change its outlet or role at the same time. On `dev` today:

- `PUT /api/users/:id` takes a new `merchantId` from ADMIN/OPS with no rules. The old outlet can stay on a
  user of another merchant, the destination merchant's plan user limit is not checked, an owner can be
  moved away and leave the source merchant without an owner, and old tokens and sessions keep the old
  merchant/role until they expire.
- `PUT /api/users/:id` and `PUT /api/merchants/:id/users/:userId` write no audit entry.
- `PUT /api/users` (id in body) still uses the older scope check: an outlet admin can edit users of
  another outlet, and a merchant can set `merchantId` to another merchant.
- The admin `UserForm` loads neither merchants nor outlets in edit mode, so the move cannot be done there.

#366 (`apps/api/lib/user-scope.ts`) already covers: out-of-scope users answered as 404 on
`/api/users/:id` and `/api/merchants/:id/users/:userId`, role limits (`canAssignRole`), merchant and outlet
callers cannot place a user outside their merchant/outlet (`isAllowedPlacement`), no password hash in
responses.

The work was first written in July on `hotfix/user-merchant-transfer` and never committed. This change
re-implements it on top of #366.

## Proposed outcome

- Only ADMIN changes a user's merchant. Products, orders and customers stay with the source merchant.
- A move checks the destination merchant (exists, active, plan `users` limit), drops the old outlet, and
  needs an outlet of the destination merchant for outlet roles.
- Any change of merchant, outlet or role sets `permissionsChangedAt` and ends the user's sessions.
- Every update through these routes is audited, without password hashes.
- `PUT /api/users` uses the #366 helpers: 403 `UPDATE_USER_OUT_OF_SCOPE` out of scope.
- Admin edit form can pick merchant and outlet.

## Affected users and systems

- Roles: `ADMIN` (moves), `OPS` (can no longer move users between merchants), `MERCHANT`,
  `OUTLET_ADMIN` (scope unchanged on `/api/users/:id`; tightened on `PUT /api/users`).
- Apps: api, admin (`packages/ui` `UserForm`), `packages/utils` (error messages), `locales/*/errors.json`.
- iOS / Android: no code change; they call `PUT /api/users/:id` with name, role, isActive, outletId.

## Constraints

- Installed apps are built from `main-real`. No response field changes; new codes only on ADMIN flows,
  except `CANNOT_TRANSFER_LAST_MERCHANT_OWNER` (returned with a readable `message`).
- Reuse `user-scope.ts`; do not repeat its checks.
- No schema change (`permissionsChangedAt` exists).
- Auth/roles change: human review.

## Open questions

- Should OPS be allowed to move users between merchants? Implemented: ADMIN only.
- Should ADMIN bypass the destination plan limit (as ADMIN does on create)? Implemented: no bypass.
- Moving an owner needs a separate ownership-transfer flow. Implemented: refused (409).
- `PUT /api/users` (id in body) still has its own ADMIN/OPS role check instead of `canAssignRole`.

## Decision log

- 2026-10-05 — Keep #366's 404 for out-of-scope users on `/api/users/:id` (no id probing); the 403
  `UPDATE_USER_OUT_OF_SCOPE` stays on `PUT /api/users`, which already answered it. (agent, to confirm)
