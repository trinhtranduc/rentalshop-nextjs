# Plan — #526

1. `apps/client/app/customers/customers-model.ts`: URL parsing, name / initials / phone / address text, page selection (all / some / none, toggle page, toggle one), export file name.
2. `apps/client/app/customers/import/import-model.ts`: row check (name, email, id type), counts, errors-first order, payload, API result mapped to file rows, 3000-row limit.
3. `tests/web-customers-model.test.ts` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
4. UI: `customers/page.tsx`, `customers/list/parts.tsx` (table, cards, detail panel, export dialog), `customers/loading.tsx`, `customers/import/page.tsx`. Reuse `orders/list/parts` (card, buttons, `FilterMenu`-style footer `TableFooter`, `StatusTag`, `scheduleText`) and `orders/create/parts` `Modal`.
5. i18n `locales/{en,vi}/customers.json` → `web`.
6. Verify: jest (both TZ), lint, client tsc, screenshots script `scratchpad/shots/customers.js` (lead runs it after the build).
