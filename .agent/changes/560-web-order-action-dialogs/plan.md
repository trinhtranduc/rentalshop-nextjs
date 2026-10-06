# Plan — #560

1. `apps/client/app/orders/detail/actions-model.ts` — pure `handOverMoney`, `returnMoney`,
   `papersText`, `scheduleRange` (no `@rentalshop/*`). Tests `tests/web-orders-actions.test.ts`,
   run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
2. `apps/client/app/orders/detail/dialogs.tsx` — `ActionDialog` shell (tokens, Esc, focus in/out,
   bottom sheet under `sm`), `HandOverDialog`, `ReturnDialog`, `ConfirmDialog`.
3. `apps/client/app/orders/[id]/page.tsx` — swap `CollectionReturnModal` / `ConfirmationDialog` for
   the new ones; same handlers.
4. `locales/{en,vi}/orders.json` — `web.detail.dialog.*`.
5. Verify: tsc, eslint, Jest both TZ, Playwright (stubbed writes, bodies logged before/after),
   light/dark 1440/390, OUTLET_STAFF.
