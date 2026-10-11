# Spec (step 1, simplified; owner 2026-10-11)

Model like Sapo: plans by tier, add-ons on top. **Plans: Basic, Pro, Enterprise** (Enterprise = multiple branches). On top of any plan the shop can have two kinds of items, **managed in one place** (one catalog, one list per shop), each priced in VND for the whole shop:
- **Add-on** (`kind = quantity`): a number of branches or staff, e.g. "Thêm chi nhánh", "Thêm nhân viên".
- **Module** (`kind = feature`): switches a feature on, e.g. **Loyalty**, **Payroll** (bảng lương).
Step 1 builds the **catalog, per-item VND prices, the shop list, the mid-period quote and the renewal total for both kinds**: the admin can create and price Add-ons **and** Modules, attach either to a shop, and the shop's next renewal total = plan + every active item (a Module counts once). What step 1 enforces: **add-ons** (limits). What step 2 adds: the feature switch itself (API 403 and apps) for Modules. Until then a Module can be priced and charged but does not yet switch anything on, so the UI shows "Chưa bật tính năng" on it and the admin attaches Payroll only when the feature exists (Loyalty is already in the plans).

## Data (one additive migration)
1. `BillingModule` (catalog, admin-defined): `id`, `name`, `kind` (`quantity` | `feature`), `featureKey` (only for `feature`: `loyalty`, `payroll`, …), `limits` (JSON per unit, only for `quantity`, any of `outlets`, `users`, `products`, `customers`, `orders`; e.g. "Thêm chi nhánh" = `{outlets:1, users:3}`, "Thêm nhân viên" = `{users:1}`), `monthlyPrice` (Float, VND per unit), `isActive`, `sortOrder`, timestamps.
2. `MerchantModule` (what a shop bought): `id`, `merchantId`, `moduleId` (null for migrated addons), `name`, `kind`, `featureKey`, `limits` (snapshots), `quantity` (Int ≥ 1; always 1 for `feature`), `unitPrice` (VND per unit per month), `removeAtPeriodEnd` (Bool), `isActive`, `endedAt?`, timestamps. The snapshot means a later catalog edit never changes a period already paid.
3. Data migration: every active `PlanLimitAddon` becomes one `MerchantModule` (`moduleId` null, name "Addon (cũ)", `limits` = its non-zero columns, `quantity` 1, `unitPrice` 0). The catalog starts empty: the admin creates the two real modules and sets their prices. `PlanLimitAddon` stays for history and is no longer written.

## Rules
4. Effective limit per entity = plan limit + Σ `quantity × limits[entity]` of active modules. `planLimitAddons.calculateTotal` reads the new table with the same return shape, so the 6 create checks do not change. After the migration every shop's limits equal today's.
5. **Branch modules only on a multi-branch plan:** a module whose `limits.outlets > 0` can be added only when the shop's plan has `outlets > 1` (Enterprise). Otherwise 422 `MODULE_NOT_AVAILABLE_FOR_PLAN`. Changing to a plan with `outlets` ≤ 1 is refused (422) while the shop still has branch modules; the admin removes them first (rule 8).
6. **Add mid-period (admin):** `amountDue = unitPrice × quantity × remainingDays / periodDays` (Vietnam civil days of the current subscription period; 0 when expired). Records a `Payment` (type `PLAN_CHANGE`, method and transaction id like renew). `unitPrice` = catalog price at that moment.
7. **Renewal (`/renew`):** `addonMonthlyTotal = Σ catalog price × quantity` of active modules not marked for removal (a migrated addon uses its own `unitPrice`, 0); the rows get the new `unitPrice`. Marked modules end (`isActive false`, `endedAt`). The response and the payment description list the modules.
8. **Remove at period end:** sets `removeAtPeriodEnd`; refused (422 `CANNOT_REMOVE_MODULE_LIMIT_EXCEEDED`) when current usage would exceed the limit without it. Undo allowed until the period ends. No refund, no mid-period change; to buy more, add another line.
9. A catalog price change affects new purchases and the next renewal only.
10. Over the limit after a module ends or the plan expires: existing branches / users stay, creating new ones is blocked, nothing is deleted.

## Feature modules (step 2, same tables)
- Effective features of a shop = plan features + `featureKey` of its active feature modules. The API checks it on every route of that feature (403 `MODULE_NOT_ENABLED` when off); the apps read the enabled list from the session / `app-config` (additive field).
- Expired or removed: the feature switches off completely and the data is kept untouched (no read-only mode); buying it again shows everything.
- Loyalty is in every plan's features today. It stays until the owner removes it from the plans; then shops that use it get the Loyalty module at price 0 in the same migration, so nobody loses it.
- Payroll: only after the owner settles its business logic.

## API (ADMIN / OPS)
11. `GET/POST /api/billing-modules`, `PUT /api/billing-modules/[id]` (hide with `isActive`, no delete).
12. `GET /api/merchants/[id]/modules` (the MERCHANT may read its own), `GET .../modules/quote?moduleId&quantity` (amount due now), `POST .../modules` (add + payment), `PATCH .../modules/[id]` (`removeAtPeriodEnd` true / false).
13. Old `plan-limit-addons` routes: GET keeps working (reads the new table, same shape); POST / PUT / DELETE → 410 `ADDONS_REPLACED_BY_MODULES`.

## Admin UI
14. `/billing-modules`: one table (name, type Add-on / Module, what it adds or enables, VND price, on / off), add and edit inline. Both types can be created and priced in step 1; a Module row shows "Chưa bật tính năng" until step 2.
15. Merchant page, block "Gói & Module": the plan, the modules (quantity, price, ends with the period, marked for removal), "Thêm module" (pick the module, quantity, quote from the API, payment fields), "Bỏ cuối kỳ" / undo, and the next renewal total (plan + modules).

## Not in scope (step 1)
The feature switch for Modules (Loyalty, Payroll: step 2), merchant self-purchase and Sepay (later), Lemon Squeezy, mobile apps.
