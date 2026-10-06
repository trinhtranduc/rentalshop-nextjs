# Plan — Shop web product form, product page and product orders

Issue: #547 · Status: accepted · Spec: ./spec.md

## Steps

1. `apps/client/app/products/form/form-model.ts`: form state from a product, pricing (per rental / per day / default,
   same rules as `@rentalshop/utils` product-pricing-options, copied because the model has no `@rentalshop/*` import),
   validation, create / update payload, photo checks (count, type, size), outlet stock sum, barcode generator.
2. `tests/web-products-form.test.ts` under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
3. UI: `products/form/ProductFormPage.tsx` (+ small parts), `products/add/page.tsx`, `products/[id]/edit/page.tsx`.
4. `products/[id]/page.tsx` (detail) and `products/[id]/orders/page.tsx` (reuses `orders/list/parts` and `orders-model`).
5. `components/ClientLayout.tsx`: drop the `/edit` full-width exception.
6. i18n (`i18n-keys`): `locales/{en,vi}/products.json` → `web.form`, `web.detail`, `web.orders`.
7. Verify: jest (both TZ), eslint on changed paths, client tsc (171 errors before, no new ones), browser screenshots
   (MERCHANT light / dark 1440, 390; OUTLET_STAFF), create → edit → detail → orders flow.

Domain skills: `i18n-keys`, `timezone-dates` (orders rows use the Vietnam day helpers already in `orders-model`).
`mobile-parity` / `api-compat-review`: not needed, no API change.

## Files

- `apps/client/app/components/ClientLayout.tsx` — shell for edit pages
- `apps/client/app/products/form/*` — new form + model
- `apps/client/app/products/add/page.tsx`, `[id]/edit/page.tsx`, `[id]/page.tsx`, `[id]/orders/page.tsx`
- `locales/{en,vi}/products.json`, `tests/web-products-form.test.ts`

## Risks

- Customer edit and order edit pages now render inside the shell (order edit already did).
- Photo payload on edit now keeps saved photos (was: replaced them). Same endpoint and field.

## Rollback

Revert the PR; no data or API change.
