# Spec (step 1)

## Data (one additive migration)
1. `BillingModule` (catalog): `id`, `name`, `kind` (`quantity` | `feature`), `limitKey` (`outlets` | `users` | `products` | `customers` | `orders`, only for `quantity`), `featureKey` (`loyalty` | `payroll`, only for `feature`), `monthlyPrice` (Float, VND, set per module by the admin), `currency` (default `VND`), `isActive`, `sortOrder`, timestamps. Both kinds exist from the first migration so step 2 needs no new table; step 1 only enforces `quantity`.
2. `MerchantModule` (what a shop has): `id`, `merchantId`, `moduleId`, `quantity` (Int ≥ 1), `unitPrice` (VND per unit per month at purchase), `removeAtPeriodEnd` (Bool), `isActive`, `endedAt?`, timestamps.
3. Data migration: modules **Loyalty** and **Payroll** (`feature`, price 0, inactive until step 2 enforces them); one `quantity` `BillingModule` per limit key at price 0 ("Thêm chi nhánh", "Thêm người dùng", "Thêm sản phẩm", "Thêm khách hàng", "Thêm đơn hàng"); every active `PlanLimitAddon` becomes one `MerchantModule` per non-zero column, `unitPrice 0`. `PlanLimitAddon` stays (history), no longer written.

## Plans vs modules (owner, 2026-10-11)
- **Multiple branches is a separate plan**, not a module: a plan with a higher `outlets` limit and its own price. Changing to it is the normal plan change of #779. Extra branches beyond the plan are still the `outlets` quantity module.
- **Modules** are sold on top of any plan: Loyalty and Payroll (`feature`, step 2), and the quantity modules (today's addons). Each module has its own price, set by the admin in the catalog.
- Each time an admin adds something to a shop they **pick the module (its type)** from the catalog; the price shown is the catalog price at that moment and is copied into `unitPrice`.
- Loyalty is in every plan's `features` today. It stays that way until the owner removes it from the plans; the migration then grants the Loyalty module at price 0 to shops that use it, so nobody loses it (step 2).

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
13. Catalog page `/billing-modules`: list, add (name, kind, limit or feature, price), edit price / active.
14. Merchant page: "Module" section replaces the addon link: list (module, quantity, price, ends with the period, marked for removal), add dialog (pick the module, quantity, price and quote from the API, payment fields), remove at period end / undo.

## Not in scope
Feature modules (step 2), merchant self-purchase and Sepay (step 3), Lemon Squeezy, mobile changes.
