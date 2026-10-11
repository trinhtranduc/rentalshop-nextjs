# Spec (step 1)

## Data (one additive migration)
1. `BillingModule` (catalog): `id`, `name`, `limitKey` (`outlets` | `users` | `products` | `customers` | `orders`), `monthlyPrice` (Float, VND), `currency` (default `VND`), `isActive`, `sortOrder`, timestamps.
2. `MerchantModule` (what a shop has): `id`, `merchantId`, `moduleId`, `quantity` (Int ≥ 1), `unitPrice` (VND per unit per month at purchase), `removeAtPeriodEnd` (Bool), `isActive`, `endedAt?`, timestamps.
3. Data migration: one `BillingModule` per limit key at price 0 ("Thêm chi nhánh", "Thêm người dùng", "Thêm sản phẩm", "Thêm khách hàng", "Thêm đơn hàng"); every active `PlanLimitAddon` becomes one `MerchantModule` per non-zero column, `unitPrice 0`. `PlanLimitAddon` stays (history), no longer written.

## Rules
4. Effective limit = plan limit + Σ `quantity` of active `MerchantModule` with that `limitKey` (`planLimitAddons.calculateTotal` reads the new table; same return shape, so every limit check keeps working). After the migration every merchant's limits equal today's.
5. Add a module mid-period (admin): `amountDue = unitPrice × quantity × remainingDays / periodDays` (Vietnam civil days of the current subscription period; 0 if expired). Records a `Payment` (`type PLAN_CHANGE`, method + transaction id like renew). Unit price = catalog price at purchase.
6. Renewal (`/renew`): `addonMonthlyTotal = Σ catalog price × quantity` of active modules not marked for removal; marked ones end (`isActive false`, `endedAt`). Renewal response and payment description list the modules.
7. Remove at period end (admin): sets `removeAtPeriodEnd`; refused (422 `CANNOT_REMOVE_MODULE_LIMIT_EXCEEDED`) when current usage > limit without it. Undo allowed before the period ends.
8. Quantity can only go up mid-period (a new purchase line); lowering = remove at period end.
9. Catalog price change: affects new purchases and the next renewal only.

## API (admin only: ADMIN / OPS)
10. `GET/POST /api/billing-modules`, `PUT /api/billing-modules/[id]` (no delete: hide with `isActive`).
11. `GET /api/merchants/[id]/modules` (MERCHANT may read its own), `GET .../modules/quote?moduleId&quantity` (amount due now), `POST .../modules` (add + payment), `PATCH .../modules/[moduleId]` (`removeAtPeriodEnd` true/false).
12. Old `plan-limit-addons` routes: GET keeps working (reads the new table, same shape); POST/PUT/DELETE → 410 `ADDONS_REPLACED_BY_MODULES`.

## UI (admin)
13. Catalog page `/billing-modules`: list, add, edit price / active.
14. Merchant page: "Module" section replaces the addon link: list (module, quantity, price, ends with the period, marked for removal), add dialog (module, quantity, quote from the API, payment fields), remove at period end / undo.

## Not in scope
Feature modules (step 2), merchant self-purchase and Sepay (step 3), Lemon Squeezy, mobile changes.
