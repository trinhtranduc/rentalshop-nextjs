# Plan — #526 Sản phẩm

1. `apps/client/app/products/list/list-model.ts`: URL parsing, API filters, prices by kind, today's stock, selection.
2. `apps/client/app/products/import/import-model.ts`: sheet → rows, header aliases, money / count parsing, row checks, payload,
   API result → file rows.
3. `tests/web-products-model.test.ts` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
4. UI: `products/list/parts.tsx` (table, row menu, selection bar), `products/page.tsx`, `products/loading.tsx`,
   `products/import/page.tsx`.
5. i18n `locales/{en,vi}/products.json` → `web`.
6. Verify: jest (both TZ), lint, client tsc (no new errors), screenshots light/dark 1440/390 (`scratchpad/shots/products.js`).
