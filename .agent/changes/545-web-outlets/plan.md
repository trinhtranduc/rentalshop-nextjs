# Plan — #545

1. `apps/client/app/outlets/outlets-model.ts` (no `@rentalshop/*` imports) + `tests/web-outlets-model.test.ts`.
2. `apps/client/app/outlets/parts.tsx`: row menu, add / edit form dialog (shell `Modal`).
3. `apps/client/app/outlets/page.tsx`, `loading.tsx`: list, dialogs. Skills: `i18n-keys`, `timezone-dates`.
4. `apps/client/app/outlets/[id]/bank-accounts/page.tsx`: header, table, shared form dialog, confirm.
5. `locales/{en,vi}/outlets.json` → `web`.
6. Verify: jest both TZ, eslint, client tsc (no new errors), browser as merchant (list, search, sort, view, edit and
   add with the POST / PUT intercepted so seeded outlets are not written, bank accounts add / edit / delete on a test
   account), OUTLET_ADMIN and OUTLET_STAFF see the page as before; light + dark at 1440 and 390; console clean.
