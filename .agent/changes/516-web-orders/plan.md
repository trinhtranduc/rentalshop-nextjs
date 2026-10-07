# Plan — #516

1. `apps/client/app/orders/orders-model.ts`: pure mapping (row schedule / note / pay, status counts, sort and date presets, pagination window, detail progress, next step, balance, history). Day keys injected (`toDayKey`).
2. `tests/web-orders-model.test.ts` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
3. List page `apps/client/app/orders/page.tsx` + `orders/list/*` components on `ar-*` tokens; `loading.tsx` skeleton.
4. Detail page `apps/client/app/orders/[id]/page.tsx` + `orders/detail/*`; reuse `CollectionReturnModal`, `ReceiptPreviewModal`, `ConfirmationDialog`, `OrderSettingsCard` (exported additively from `@rentalshop/ui`).
5. i18n keys in `locales/{en,vi}/orders.json` under `web`.
6. Verify: jest (both TZ), lint, client tsc (baseline 176), admin tsc (baseline 279), build, screenshots light/dark 1440/390 + staff.
