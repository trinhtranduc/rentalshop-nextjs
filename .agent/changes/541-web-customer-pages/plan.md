# Plan — #541

1. `apps/client/app/customers/customer-form-model.ts` (no `@rentalshop/*` imports): form values from a customer, validation, name split, create payload, changed-fields payload, save-error text key, profile helpers (full address line).
2. `tests/web-customers-form.test.ts`, run with `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh` (skill `timezone-dates`).
3. `apps/client/app/customers/form/CustomerForm.tsx`: the shared form (field pattern from `settings/sections`, `fieldClass`, `outlineBtn` / `primaryBtn`).
4. Pages: `customers/add/page.tsx`, `customers/[id]/edit/page.tsx` use it; `customers/[id]/page.tsx` profile; `customers/[id]/orders/page.tsx` orders. Shared bits in `customers/profile/parts.tsx` (customer loader, back link, stats). Reuse `list/parts` (`DeleteDialog`, customer orders hook), `orders/list/parts` (`OrdersTable`, `TableFooter`, `StatusTag`, `Skeleton`).
5. i18n (skill `i18n-keys`): `locales/{en,vi}/customers.json` → `web.form`, `web.profile`, `web.orders`.
6. Verify (skill `verify-change`): client tsc before/after count, eslint on changed paths, jest both TZ, browser on :3292 (MERCHANT light/dark 1440 + 390, OUTLET_STAFF): add → edit → profile → orders, 0 page errors.
