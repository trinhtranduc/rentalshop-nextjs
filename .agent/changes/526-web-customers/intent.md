# Intent — #526 Shop web Khách hàng (+ Nhập khách từ Excel)

Issue: #526 · Part of the shop web redesign (boards `Khach-hang`, `Nhap-khach`)

## What

Redraw `/customers` of the shop web (`apps/client`) to the board `Khach-hang`: a searchable list with row checkboxes, "Xuất Excel" for the chosen customers, page sizes 10/20/50/100, and a detail panel (contact, order count, money spent without cancelled orders, renting now, latest orders). Redraw `/customers/import` to the board `Nhap-khach`: choose a file → check rows with errors → result.

## Why

The old list was a generic table in light-only shadcn parts; the shop could not see what a customer is worth or their latest orders without opening another page, and the import refused the whole file when one row was wrong.

## Constraints

- UI only. Reuse `GET /api/customers` (word-prefix, accent-insensitive search scoped to the merchant), `GET /api/customers/{id}/orders` (`summary.totalAmount` excludes cancelled, #405), `GET /api/orders?customerId&status=PICKUPED`, `GET /api/customers/export` (`customerIds` or a period), `DELETE /api/customers/{id}`, `POST /api/customers/bulk-import` (max 3000 rows), `GET /api/import/sample/customers`. No API change.
- Same permissions as before: import needs `customers.manage`, export `customers.export`, delete `customers.manage`. Add / edit / detail / customer orders pages stay as they are.
- Days are Vietnam civil days. `ar-*` tokens only, light and dark, 390px wide.
- New strings in `locales/{en,vi}/customers.json` under `web` (the namespace exists only in en and vi).
