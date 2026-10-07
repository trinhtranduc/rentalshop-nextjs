# Plan — #523

1. `apps/client/app/orders/create/create-model.ts`: pure cart logic (line from product / from order item, reprice, totals, discount, cọc default, còn thu, stock label from the availability result, days label, Vietnam day range for the API, payload for create / edit, what is missing).
2. `tests/web-create-order-model.test.ts` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
3. `apps/client/app/orders/create/` UI: `OrderEditor.tsx` (screen), `parts.tsx` (grid card, cart line, dialogs on `ar-*` tokens), `useLoyalty.ts`.
4. `apps/client/app/orders/create/page.tsx` and `apps/client/app/orders/[id]/edit/page.tsx` render `OrderEditor`.
5. i18n `locales/{en,vi}/orders.json` → `web.editor`.
6. Verify: jest (both TZ), lint, client tsc (baseline 174), build, screenshots light/dark 1440/390, edit.
