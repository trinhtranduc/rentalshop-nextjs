# Plan — #544

Issue: #544 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/client/app/users/staff-form-model.ts` (pure): `canCreateStaff`, `roleChoices`, `canPickOutlet`,
   `splitName`, `validateStaffForm`, `createPayload`, `editPayload`, `formFromUser`, `passwordResetProblem`,
   `readOutlets`. Tests `tests/web-users-form.test.ts`.
2. `apps/client/app/users/staff-parts.tsx`: role tag classes (moved from the list), avatar, field, password
   input, outlet chips, role cards, page head.
3. `apps/client/app/users/add/page.tsx`: rewrite.
4. `apps/client/app/users/[id]/page.tsx`: rewrite with Sửa / Đổi mật khẩu / confirm dialogs (`Modal`).
5. `apps/client/app/users/page.tsx`: import the shared role classes (no behavior change).
6. i18n `locales/{en,vi}/users.json` (`i18n-keys`).
7. Verify: jest both TZ, eslint, client tsc before/after, browser flows + screenshots.

## Files

- `apps/client/app/users/staff-form-model.ts`, `staff-parts.tsx` — new
- `apps/client/app/users/add/page.tsx`, `[id]/page.tsx` — rewrite
- `apps/client/app/users/page.tsx` — shared import
- `locales/{en,vi}/users.json`, `tests/web-users-form.test.ts`

## Risks

Losing a rule of the old shared form; covered by the model tests and the browser flow. No data risk.

## Rollback

Revert the PR.
