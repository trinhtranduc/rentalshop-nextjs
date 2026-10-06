# Intent — #541 Shop web customer form, profile and customer orders

Issue: #541 · Author: agent (for Trinh Tran) · Status: accepted · Created: 2026-10-06

## Problem

`/customers` was redrawn in #526, but the pages it links to are still the old UI: light-only shared cards from `@rentalshop/ui`, `bg-white` / `text-gray-*`, English strings ("Add New Customer", "Customers > John Smith > Orders", "Total Revenue $376.00"). Add and edit use two different forms (first + last name vs one name field). The customer orders page sums the current page of orders, cancelled included, and calls it revenue. The owner pointed at `/customers/29/edit` as still old.

## Proposed outcome

- `/customers/add` and `/customers/[id]/edit` render one shared form on the shell tokens, same API calls.
- `/customers/[id]` is a profile page in the shell style: contact, latest orders, stats (cancelled excluded from money), loyalty points when loyalty is on, delete.
- `/customers/[id]/orders` looks like the Đơn hàng list filtered to one customer.
- Works in light and dark (`html[data-ar-theme=dark]`) and at 390px. Days are Vietnam civil days.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on `apps/client`. No API, no `packages/**`, no mobile, no migration.

## Constraints

- UI only: `customersApi.getCustomerById / createCustomer / updateCustomer / deleteCustomer`, `ordersApi.getOrdersByCustomer`, `ordersApi.searchOrders({customerId,status:'PICKUPED'})` (already used by the list panel), `loyaltyApi.getCustomerSummary / getCustomerTransactions`.
- `packages/ui` stays as is (admin uses the shared components). `ClientLayout.tsx` is owned by the products agent (it drops the full-width exception for edit pages).
- Strings in `locales/{en,vi}/customers.json` under `web` (only en and vi have this namespace).

## Open questions

- None blocking. See decision log.

## Decision log

- 2026-10-06 — "Công ty" (`companyName`) is not kept: there is no column and the API zod schema strips it, so the old field never saved. Replaced by stored fields the profile already shows (Số giấy tờ `idNumber`, Ghi chú `notes`). (agent; the dropped field never persisted)
- 2026-10-06 — The add page no longer writes the fixed note "Customer created via admin interface"; notes come from the form. (agent)
- 2026-10-06 — Validation per mode as today: name required (≥ 2 chars); phone optional on create, required on edit when the customer already has one (clearing it would store "" and clash with the unique phone); email format checked when given. (agent)
- 2026-10-06 — Customer orders: no status chips, `GET /api/customers/{id}/orders` has no status filter and the brief says same API calls. (agent)
