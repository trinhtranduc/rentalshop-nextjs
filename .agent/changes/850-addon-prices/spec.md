# Spec — #850 add-on prices

Owner decisions: #850 last comment (2026-10-11) + mockup PjnxEfi3tXwS8GWM775kZY. Builds on #782 (branch
`feat/782-modules`, not merged): it reuses #782's proration, renewal total and removal-at-period-end logic, and its tests.
The model changes: no feature modules, a pack size per catalog row, and the existing `PlanLimitAddon` table stays the
per-shop store, so the limit checks, the extend routes and old callers do not change.

## Data (one additive migration `20261012090000_addon_prices`)

1. New table **`AddonPrice`** (the catalog): `id`, `name`, `limitKind` (`outlets` | `users` | `products` |
   `customers` | `orders`), `packSize` Int ≥ 1 ("mỗi gói cộng thêm N"), `monthlyPrice` Int (VND per pack per
   month, ≥ 0), `currency` `VND`, `isActive` (true = "Đang bán", false = "Tạm tắt"), `sortOrder`, timestamps.
   Several rows may share a `limitKind` (+1 user 30.000 ₫, +2 users 40.000 ₫). No delete; pause instead.
2. **`PlanLimitAddon`** gets nullable / defaulted columns (nothing dropped, renamed or retyped):
   `addonPriceId` (FK → AddonPrice, `SET NULL`), `name`, `limitKind`, `packSize`, `packs`, `unitPrice` Int
   (VND per pack per month captured at purchase), `removeAtPeriodEnd` Bool default false, `endsAt`, `endedAt`.
   A priced item stores its limit in its kind's column, as today: `users = packSize × packs`. The five
   columns are still the only thing the limit check sums.
3. Data step in the same migration: an **active** old row with more than one non-zero column is split into one row
   per kind (one kind per item, owner #782). The original row keeps its first non-zero kind in the order outlets,
   users, products, customers, orders, and a new row is inserted for each other kind with the same `merchantId`,
   `notes` and `createdAt`. Then every active single-kind row with no `limitKind` gets `limitKind`,
   `packSize = value`, `packs = 1`. `unitPrice` stays NULL, which marks an old free add-on. The column sums
   per shop are unchanged, so every shop has exactly today's limits. The code does not show what production holds
   (rows are created by hand in admin), and no one connects to production. The SQL handles zero rows and any number of rows.
   Inactive rows are not touched.

## Rules

4. **Effective limit** per kind = plan limit + Σ column of the shop's add-ons that are `isActive` and not ended
   (`endsAt` NULL or later than now). This is `db.planLimitAddons.calculateTotal`, with the same return shape and the same
   unlimited / 0 handling as today. Only the "not ended" filter is new.
5. **Catalog** (`AddonPrice`): `name` 1–100 chars, `limitKind` one of the five, `packSize` integer 1–1 000 000,
   `monthlyPrice` integer 0–1 000 000 000 VND. On edit: `name`, `monthlyPrice`, `isActive`, `sortOrder`.
   `packSize` can change only while no shop has an un-ended item from that row (else 422 `ADDON_PRICE_IN_USE`).
   `limitKind` never changes.
6. **Price edit** applies to new purchases and later renewals. A bought item keeps its `unitPrice` until its paid
   period ends. **Tạm tắt**: the row cannot be bought (422 `ADDON_PRICE_NOT_ON_SALE`); items already bought keep running to
   the end of the current period and are not renewed (rule 9).
7. **Add to a shop** (ADMIN): pick `addonPriceId` + `packs` (integer 1–1 000). The price is never sent by the client.
   - An `outlets` row needs a multi-branch plan (`isMultiBranchPlan`, #826): else 422 `ADDON_OUTLETS_NEED_MULTI_BRANCH_PLAN`.
   - The shop needs a subscription: else 404 `SUBSCRIPTION_NOT_FOUND`.
   - **Charge now** = `round(cyclePrice × remainingDays ÷ periodDays)`, where `periodDays` = Vietnam civil days
     from `currentPeriodStart` to `currentPeriodEnd` (≥ 1), `remainingDays` = Vietnam days from today to the end
     (clamped 0..periodDays), and `cyclePrice` = monthly price × packs for the subscription's cycle, with the same
     cycle discount as renewal (`calculateSubscriptionPrice`). For a monthly period this is exactly
     `price × packs × days left ÷ days in period`, the owner's formula.
   - Charge now = 0 when the period has ended or the subscription is `TRIAL`.
   - When the charge is > 0, a `Payment` is written: type `PLAN_CHANGE`, method `TRANSFER` (default) or `STRIPE`,
     status as in renew, optional `transactionId` / `reference`, a description naming the add-on, and `metadata` with
     the numbers. No new enum value.
   - The item ends with the current period only when removed (rule 8) or not renewed (rule 9).
8. **Remove** (ADMIN): `removeAtPeriodEnd = true` sets `endsAt = currentPeriodEnd`. The item still counts until
   then. Refused with 422 `CANNOT_DELETE_ADDON_LIMIT_EXCEEDED` (existing code and data) when the shop's current usage
   would be above the limit without it. **Undo** is allowed while the item is in the same period
   (`endsAt` = the subscription's current end, still in the future). Otherwise 422 `ADDON_ALREADY_ENDED`. No refund.
9. **Renewal** (`POST /api/subscriptions/[id]/renew`): the add-on total =
   Σ catalog `monthlyPrice` × `packs` over un-ended items that are not marked for removal and whose catalog row
   is on sale. An old free item counts its `unitPrice` (NULL → 0). The total is passed as `addonMonthlyTotal`, so the
   cycle discount 0/0/5/10 % applies to it too. The payment amount = plan + add-ons. `subscription.amount` stays the
   plan price, the same meaning as today. In the same transaction, renewed items take the catalog price as their
   new `unitPrice`. Items marked for removal, or whose row is paused, end at the old period end (`endsAt`,
   `endedAt`, and `isActive = false` when that end has passed). The response adds `addons` (list) and keeps every
   existing field.
10. Over the limit after an item ends: nothing is deleted. Creating more is blocked by the existing check.

## API

| Route | Roles | Notes |
|---|---|---|
| `GET /api/addon-prices` | ADMIN, OPS | rows + `shopsUsing` (shops with an un-ended item from the row) |
| `POST /api/addon-prices` | ADMIN | rule 5 |
| `PUT /api/addon-prices/[id]` | ADMIN | rule 5–6 |
| `GET /api/merchants/[id]/addons` | ADMIN, OPS | un-ended items, plan / add-on / effective limits, usage, period, `monthlyTotal`, 1-month renewal preview |
| `GET /api/merchants/[id]/addons/quote?addonPriceId&packs` | ADMIN, OPS | rule 7 numbers, nothing written |
| `POST /api/merchants/[id]/addons` | ADMIN | rule 7 |
| `PATCH /api/merchants/[id]/addons/[addonId]` | ADMIN | `{ removeAtPeriodEnd }`, rule 8 |

All routes use `withAuthRoles`, zod, `ResponseBuilder` and `handleApiError`, and read data through `db`. Ids are the
numeric ids these tables already expose (no CUID). OPS calling a write route gets 403.

Old routes stay. `GET /api/plan-limit-addons*` returns the same shape plus the new columns. `POST` works as today.
`PUT` / `DELETE` on a **priced** row (`addonPriceId` set) → 422 `PRICED_ADDON_READ_ONLY`, so its columns cannot drift
from packs × pack size. Old rows behave as before.

New error codes (5 locales, `ErrorCode`, iOS `ErrorCodes.swift` table): `ADDON_PRICE_NOT_FOUND` 404,
`ADDON_PRICE_NOT_ON_SALE` 422, `ADDON_PRICE_IN_USE` 422, `ADDON_ALREADY_ENDED` 422, `PRICED_ADDON_READ_ONLY` 422.

## Admin UI (mockup)

11. Nav: **Plans → Add-on prices** (`/plans/addon-prices`), under Plans.
12. Page: a table with Loại add-on (name + kind), Cộng thêm (+N kind), Giá / tháng (VND / gói), Áp dụng cho gói
    ("Chỉ gói nhiều chi nhánh" for outlets, else "Mọi gói"), Đang dùng (N shop), Trạng thái (Đang bán / Tạm tắt),
    and "Sửa giá". "+ Thêm loại add-on" opens a dialog. The edit dialog shows current vs new price and "N shop đang dùng giữ
    giá cũ đến hết kỳ đã trả". OPS sees the table without buttons. Phone width 390px: the table scrolls inside its card.
13. Merchant → **Add-on** (`/merchants/[id]/addons`; the old `/plan-limit-addons` page redirects there; the quick
    action is renamed "Add-on"). Left card "Thêm add-on": pack select (only rows on sale; outlets rows only on a
    multi-branch plan), number of packs, and the quote from the API (price, days left / days, formula, total due now),
    then a button "Thêm add-on · <amount>". Right card "Add-on của shop": each item with packs, + amount, price per month,
    and a badge (Đang dùng / Gỡ cuối kỳ / Add-on cũ). "Gỡ cuối kỳ" / "Hoàn tác" buttons. Below: limits (plan + add-on =
    total, usage) and "Gia hạn 1 tháng sẽ thu" (plan + each renewed add-on + total). Strings in Vietnamese, as in the
    mockup. The admin has no i18n in pages; API errors are shown through `translateError`.
14. The subscription renewal modal (`ManualRenewalModal`) counts the shop's add-on monthly total in its preview, as the
    API does.

## API compatibility (against `release-2026-10-11`)

| Area | Old callers on `release-2026-10-11` | Verdict |
|---|---|---|
| `POST /api/subscriptions/[id]/renew` | admin `apps/admin/app/subscriptions/[id]/page.tsx:193`; shop web `apps/client/app/components/SettingsSubscriptionMerchantActions.tsx:241`. iOS/Android: none | safe. Response additive (`addons`). Payment amount includes add-ons only for shops that bought priced add-ons, and none exist before deploy. `subscription.amount` keeps its meaning (plan price). |
| Plan limits (`calculateTotal`, used by create users / outlets / products / customers / orders and the limit info in sessions) | iOS create flows + `PLAN_LIMIT_EXCEEDED` (`Model/ErrorCodes.swift`); Android `domain/error/ApiErrorMessages.kt:29` | safe. The migration keeps every shop's sums, and the only new filter (`endsAt`) applies to items marked by the new flow. Same code, same shape. |
| `GET /api/plan-limit-addons*`, `GET /api/merchants/[id]/plan-limit-addons` | admin `apps/admin/app/merchants/[id]/page.tsx:69`, `plan-limit-addons/page.tsx:99`, `subscriptions/[id]/page.tsx:109`, `packages/ui/.../SubscriptionChangePlanDialog.tsx:94`, `SubscriptionExtendDialogEnhanced.tsx:171`. iOS/Android: none (iOS only has the error code `planLimitAddonNotFound`) | safe. Additive columns. A split old row shows as 2+ rows with the same total. |
| `PUT` / `DELETE /api/plan-limit-addons/[id]` | admin `plan-limit-addons/page.tsx:186,209` | new 422 `PRICED_ADDON_READ_ONLY` only on priced rows, which old tabs never created. Old rows unchanged. |
| `POST /api/subscriptions/[id]/extend`, `/extend/calculate` | admin `merchants/[id]/page.tsx:270`, `subscriptions/[id]/page.tsx:167`, `subscriptions/page.tsx:301` | safe. `addons.items` same shape. Ended items are left out. |
| `GET /api/subscriptions/status` (iOS `APIEndpoint.swift:112`, Android `ApiClient.kt:1024`) | — | not touched |
| New routes `/api/addon-prices*`, `/api/merchants/[id]/addons*` | none | new |
| Migration | — | additive (new table, nullable / defaulted columns, data split that keeps sums). The old code runs on the new schema. |

## Out of scope

Merchant self-purchase and online payment (later). Feature modules (#782 step 2). Charging add-ons in `extend`,
`change-plan`, Stripe or Lemon webhooks. A refusal to switch to a single-branch plan while branch add-ons exist.
Showing add-ons in the shop web or mobile subscription screens. Retiring the old free `POST plan-limit-addons`
routes (no UI calls them after this change).

## Choices made here (shown to the owner on #850)

- 3/6/12-month periods: the mid-period charge prorates the add-on's cycle price, with the cycle discount (same as
  renewal). Monthly periods are exactly the owner's formula.
- A shop on `TRIAL` or with an ended period pays 0 now. The add-on is charged from the next renewal.
- A paused row's items are not renewed. They end with the period they were paid for.
- An item cannot be marked for removal when the shop's current usage would exceed the limit without it (#780 "never below current usage").
- Pack size of a catalog row can change only while no shop uses it. Otherwise add a new row.
