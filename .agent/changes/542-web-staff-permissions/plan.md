# Plan — #542

Issue: #542 · Status: accepted · Spec: ./spec.md

## Steps

1. Test first: `tests/web-users-permissions.test.ts` for `permissions-model.ts` (payload keeps off
   switches, prefill from the GET rows, module toggle, role defaults per group, who may open). Run, see it
   fail (module missing), commit `test(client): …`.
2. `apps/client/app/users/permissions/permissions-model.ts`: pure (no `@rentalshop/*`): permission groups
   (keys only; labels in i18n), `canManagePermissions`, `permissionPayload`, `permissionsFromRows`,
   `toggleGroup`, `roleGrants`.
3. `apps/client/app/users/permissions/page.tsx`: redraw (shell tokens, `cardClass`, `Skeleton`), staff list
   via `authenticatedFetch(apiUrls.users.list?role=OUTLET_STAFF)`, prefill via `usersApi.getUserPermissions`,
   save via `authenticatedFetch(`${apiUrls.base}/api/users/permissions/bulk`)`.
4. `apps/client/app/users/role-permissions/page.tsx`: redraw read-only view from `ROLE_PERMISSIONS`
   (`@rentalshop/auth`, as the shared view did).
5. i18n: `locales/{en,vi}/users.json` → `web.permissions.*`, `web.rolePermissions.*` (skill `i18n-keys`;
   only en/vi carry `web`).
6. Verify: jest both TZ, eslint on the paths, client tsc before/after, browser screenshots.

## Files

- `apps/client/app/users/permissions/permissions-model.ts` — new, pure
- `apps/client/app/users/permissions/page.tsx` — rewrite
- `apps/client/app/users/role-permissions/page.tsx` — rewrite
- `locales/{en,vi}/users.json` — strings
- `tests/web-users-permissions.test.ts` — new

## Risks

None for data: same endpoint, now actually reached. Saving bulk rows does not change access today (see intent).

## Rollback

Revert the PR; the page goes back to crashing.
