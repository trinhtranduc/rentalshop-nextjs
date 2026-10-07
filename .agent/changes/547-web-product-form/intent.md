# Intent — Shop web product form, product page and product orders on the new shell

Issue: #547 · Author: Claude (for Trinh Tran) · Status: accepted · Created: 2026-10-06

## Problem

Four product pages of the shop web (`apps/client`) still use the old light-only UI (shared `@rentalshop/ui`
`ProductAddForm` / `ProductEdit` / `ProductDetail` / `ProductOrdersView`, gray/white classes, some English):

- `/products/add` and `/products/[id]/edit`: two wrappers around the shared `ProductForm`. Edit pages render full width
  without the shell (`ClientLayout` `isFullWidthPage`), white sticky bar, dark mode broken. In edit mode the existing photos
  are not shown, and adding a photo replaces all saved photos (the form sends `images: ''` plus the files).
- `/products/[id]`: old cards and buttons, white loading overlay.
- `/products/[id]/orders`: English breadcrumb "Products > … > Orders", old stat cards, "Total Revenue $…" summed from the
  first 20 rows only, old order table.

## Proposed outcome

- One product form (create + edit) inside the shell on the `ar-*` tokens, every field and rule of the old form kept.
- Product page and product orders page redrawn like the already-redrawn Sản phẩm / Đơn hàng screens.
- `ClientLayout` no longer renders any `/edit` page full width (customer edit is redrawn in parallel and needs the shell).
- Light + dark, 1440 and 390 px. Vietnamese strings under `products.web` (en + vi, the only locales with `products.json`).

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN` (create, edit, prices, delete), `OUTLET_STAFF` (create without prices; no edit, no delete).
`apps/client` only. No API, no `packages/**`, no mobile change (admin keeps the shared components).

## Constraints

- Same API calls: `productsApi.getProductById / createProduct / updateProduct / deleteProduct / syncProductEmbeddings`,
  `categoriesApi.getCategories`, `outletsApi.getOutletsByMerchant`, `ordersApi.searchOrders` (GET /api/orders, `productId`).
- Pure form logic in `products/form/form-model.ts` (no `@rentalshop/*` import), tested in `tests/web-products-form.test.ts`.

## Open questions

- SKU: the old form shows an "SKU" input that is never sent (no DB column). Dropped; the barcode is the product code.
- Old web rules "Giá bán is required" and "Số lượng must be > 0" differ from iOS (both optional / ≥ 0). Kept as-is (UI-only
  change); flagged in the PR for the owner.

## Decision log

- 2026-10-06 — Owner: "redraw every page still on the old UI, following the design system; many issues, many PRs".
- 2026-10-06 — Edit keeps saved photos: the form sends the kept photo URLs in `images` with the new files; the API already
  combines them (`combineProductImages`). Removing every saved photo without adding one leaves them unchanged (API drops an
  empty list); the form says so.
- 2026-10-06 — Found in the browser: OUTLET_STAFF could not add a product on the web (old form too): the create schema
  requires `rentPrice` and the form sent none. Create now sends `rentPrice: 0` for users without price rights (the API's
  own default, same as iOS `CreateProductRequest`). Edit still sends no price for them.
- 2026-10-06 — Product orders page drops "Tổng doanh thu" (it summed one page, misleading); shows stock and order counts.
