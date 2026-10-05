# Plan — Admin moves a user account to another merchant

Issue: #443 · Status: draft · Spec: ./spec.md

## Steps

1. Tests first: `tests/api/user-merchant-transfer.test.ts` (mocking style of `user-route-scope.test.ts`).
   Admin move, plan limit, outlet rules, owner rules, OPS/merchant refused, out-of-scope 403 on
   `PUT /api/users`, merchant route. Red before the route changes.
2. `apps/api/lib/user-merchant-assignment.ts`: `applyUserAccessChange(actor, existingUser, updateData)`
   (spec 1–9) and `buildUserAuditContext` (moved from `users/route.ts`).
3. Routes (`api-route-standard`):
   - `apps/api/app/api/users/[id]/route.ts` — call the helper, audit, invalidate sessions on access change.
   - `apps/api/app/api/merchants/[id]/users/[userId]/route.ts` — same.
   - `apps/api/app/api/users/route.ts` (PUT) — `canAccessUser` + `isAllowedPlacement`, helper, audit
     via `toPublicUser`, `handleApiError` in catch.
4. Error codes (`i18n-keys`): `packages/utils/src/api/response-builder.ts`, `locales/{en,vi,ja,ko,zh}/errors.json`,
   `locales/vi/errors-mobile.json` (`CANNOT_TRANSFER_LAST_MERCHANT_OWNER` only).
5. `packages/ui/src/components/features/Users/components/UserForm.tsx`: load merchants/outlets in edit mode,
   clear outlet on merchant change (from the July WIP).
6. `api-compat-review` against `origin/main-real` callers; table in the PR.

## Verify

- `cd tests && npx jest api/`
- `npx tsc --noEmit -p apps/api/tsconfig.json` — no errors in changed files
- `cd apps/api && npx eslint <changed files>` — no new errors on changed lines

## Files

- `apps/api/lib/user-merchant-assignment.ts` — new rules helper
- `apps/api/app/api/users/[id]/route.ts`, `apps/api/app/api/users/route.ts`,
  `apps/api/app/api/merchants/[id]/users/[userId]/route.ts` — use it
- `packages/utils/src/api/response-builder.ts`, `locales/*/errors.json`, `locales/vi/errors-mobile.json` — codes
- `packages/ui/.../UserForm.tsx` — admin edit form
- `tests/api/user-merchant-transfer.test.ts` — tests

## Risks

- Staff whose outlet or role is changed (also from the POS apps) are now signed out at once. Intended.
- A move into a merchant that already has the same email or phone hits the `[merchantId, email]` /
  `[merchantId, phone]` unique index; answered by `handleApiError` on `/api/users` and `/api/users/:id`,
  as 500 `INTERNAL_SERVER_ERROR` on the merchant route (its catch block is unchanged).
- `PUT /api/users` now limits outlet admins to their outlet and merchants to their merchant.

## Rollback

Revert the PR. No migration, no data change beyond the moved users themselves.
