# Intent — #526 Shop web Sản phẩm (+ Nhập sản phẩm từ Excel)

Issue: #526 · Phase 5 of the shop web redesign (boards `San-pham`, `Nhap-san-pham`)

## What

Redraw `/products` of the shop web (`apps/client`) to the approved board `San-pham`: category chips with counts, a table with
"Thuê theo lần / Thuê theo ngày / Giá bán / Hôm nay", row checkboxes with a selection bar ("Xuất Excel (n)"), and the shared
page-size footer. Add `/products/import`, a 3-step Excel import page (board `Nhap-san-pham`) that shows the rows with errors
before anything is saved.

## Why

The old list was the generic shadcn table (light only, prices in one column, stock without "today"). The old import dialog sent
the file to an all-or-nothing API: one unknown category or a bad price rejected the whole file, and the row numbers it showed
were the request's, not the file's.

## Constraints

- UI only. Reuse `GET /api/products`, `GET /api/categories`, `GET /api/products/export?productIds=`, `DELETE /api/products/[id]`,
  `POST /api/products/batch-delete`, `POST /api/products/sync-embeddings`, `POST /api/products/bulk-import` (max 3000 rows),
  `GET /api/import/sample/products`. No API change.
- Keep every capability and permission of the old page: add (`products.create|manage`), edit (`products.update|manage`; not
  `OUTLET_STAFF`), delete / batch delete / import / image-search sync (`products.manage`), export (`MERCHANT`, `OUTLET_ADMIN`,
  platform staff), detail and product orders pages, photo search.
- `/products/add`, `/products/[id]`, `/products/[id]/edit` stay as they are.
- New strings in `locales/{en,vi}/products.json` under `web` (the namespace exists only in en / vi).
