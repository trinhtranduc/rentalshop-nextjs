# Plan — #569

1. `apps/client/app/orders/create/confirm-model.ts` — pure `confirmView(input)`: title/collect/confirm keys,
   customer, day range, item rows, discount, loyalty, total, collect. No `@rentalshop/*` imports.
2. `tests/web-orders-confirm.test.ts` — rows equal `buildPayload` / `computeTotals`; rent per-day and
   per-rental lines, discount, deposit, sale, loyalty, overlap button key; run under `TZ=UTC` and
   `TZ=Asia/Ho_Chi_Minh`.
3. `apps/client/app/orders/create/ConfirmDialog.tsx` — reuses `ActionDialog` from `../detail/dialogs`.
4. `OrderEditor.tsx` — one `payloadNow()` for the dialog and the request; create opens the dialog; edit
   keeps the overlap modal. `parts.tsx` untouched.
5. `locales/{en,vi}/orders.json` — `web.editor.confirm.*`.
6. Verify: tsc, eslint, Jest both TZ, Playwright (bodies logged before/after), light/dark 1440/390,
   OUTLET_STAFF, edit. Cancel the orders created.
