# Intent — #542 Phân quyền crash, and both permission pages on the shell

Issue: #542 · Author: agent (for Trinh Tran) · Status: accepted · Created: 2026-10-06

## Problem

- `/users/permissions` crashes on open ("Element type is invalid … PermissionsPage"). It imports
  `PermissionModule` and `UserSelector` from `@rentalshop/ui`; neither is exported. `tsc` reports both
  (TS2305). Every merchant or outlet admin who clicks "Phân quyền thêm cho nhân viên" on Nhân viên hits it.
- Its save used raw `fetch('/api/users/permissions/bulk')` on the client origin (never reaches the API),
  and dropped switched-off permissions from the payload.
- `/users/role-permissions` still renders the old light-only shared view with English text.

## Proposed outcome

Both pages open in the shop shell on the `ar-*` tokens (light + dark, 390px) with Vietnamese strings;
Phân quyền saves through the existing bulk endpoint and sends every switch's value.

## Affected users and systems

MERCHANT, OUTLET_ADMIN (OUTLET_STAFF sees a no-access note). `apps/client` only.

## Constraints

- UI only: `GET /api/users` (role `OUTLET_STAFF`), `GET /api/users/{id}/permissions`,
  `POST /api/users/permissions/bulk`. No API, no `packages/**` change.
- Bug cause is a bad import: no logic test can reproduce a missing export. The failing check is `tsc`
  (TS2305) and the browser page error. The payload rule (send off switches) is pure logic and gets a test first.

## Open questions

- Per-user permission rows (`UserPermission`) are stored by the API but `getUserPermissions` in
  `packages/auth` only reads role defaults + `MerchantRole`. So the switches are saved but do not change
  access today. Out of scope here (API/auth change); reported to the owner.

- Found during the fix: the per-user permission endpoints reference a `UserPermission` model that is no
  longer in the schema (GET 422, save fails). Filed #548; the page keeps the same calls (UI-only rule).

## Decision log

- 2026-10-06 — split from the add/detail redraw (#544): bug first, as asked (agent).
