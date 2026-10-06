# Plan — #543

1. `apps/client/app/categories/categories-model.ts`: URL params, validation, date text, row actions (no `@rentalshop/*` imports).
2. `tests/web-categories-model.test.ts` (TZ=UTC and TZ=Asia/Ho_Chi_Minh).
3. `apps/client/app/categories/page.tsx` + `loading.tsx`: shell layout, table, list, dialogs (reuse `orders/list/parts`
   Skeleton / TableFooter / buttons, `orders/create/parts` Modal + fieldClass). Skills: `i18n-keys`, `timezone-dates`.
4. `locales/{en,vi}/categories.json` → `web`.
5. Verify: jest both TZ, eslint on the paths, client tsc (no new errors), browser flow as merchant (create / edit / view /
   delete "E2E Danh mục test") and staff, light + dark at 1440 and 390, console clean.
