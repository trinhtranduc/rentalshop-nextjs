# Spec — #870

## Rules

1. **Shared helper.** `addonRenewalLines(items, catalog, now)` (`packages/utils/src/core/addon-pricing.ts`) decides,
   per un-ended item: renewed (row on sale, not marked) at the row's current `monthlyPrice` **and `packSize`**, or
   not renewed (marked or paused: ends at the old period end). It returns `monthlyTotal` (next period) and, new,
   `paidMonthlyTotal` = Σ captured `unitPrice × packs` of the renewed items (what the current period was paid at).
   Every path reads items with `db.merchantAddons.renewalItems` and writes with `db.merchantAddons.applyRenewal`.
2. **applyRenewal** also sets a renewed priced item's `packSize` to the row's and its kind column to
   `packSize × packs` (old free items unchanged).
3. **Renew** — as #869 (now also applies the pack size).
4. **Extend** (`POST /extend`, `GET /extend/calculate`): extension price = plan part (unchanged formula) + the add-on
   part computed by the same formula with `addonMonthlyTotal` as base price. `totalPrice` / auto `amount` = plan + add-ons;
   `extensionPrice` keeps the plan part. New fields: `addonMonthlyTotal`, `addonPrice` (calculate) and
   `extensionDetails.addonPrice` (extend). `POST /extend` runs `applyRenewal` in its transaction. An explicit `amount`
   in the body still wins (the admin dialog sends the preview's `totalPrice`).
5. **Change-plan** (`changePlan` in `packages/database/src/subscription.ts`): due = new plan cycle + add-on cycle
   (`monthlyTotal`, cycle discount) − plan credit (unchanged) − add-on credit. Add-on credit = `paidMonthlyTotal`'s
   old-cycle price × days left ÷ period days, and 0 for a `TRIAL` (nothing was paid). `applyRenewal` runs in the
   same transaction. `planChange` adds `addonPeriodPrice`, `addonCreditValue`. The admin change-plan dialog
   preview takes the same two totals from `GET /api/merchants/[id]/addons` (`renewal.addonPaidMonthlyTotal`, new).
6. **Plan switch guard**: new plan not multi-branch (`isMultiBranchPlan`) and the shop has an un-ended add-on with
   `outlets > 0` that is not marked for removal → 422 `PLAN_CHANGE_REMOVE_OUTLET_ADDONS` (5 locales):
   "remove the branch add-ons first".
7. **Pack size edit** (`PUT /api/addon-prices/[id]`): allowed while shops use the row (no more
   `ADDON_PRICE_IN_USE`; the code stays defined). The dialog shows one line: "N shop đang dùng, áp dụng từ kỳ gia hạn sau".
8. **Packs of a shop's item** (owner, later on 2026-10-11): `PATCH /api/merchants/[id]/addons/[addonId]` takes
   `packs` (1–1 000, plus optional `method` / `transactionId` / `reference`). **More** packs apply at once and charge
   now the #869 quote for the extra packs (catalog price × extra × days left ÷ days, 0 in trial / ended period); the
   kind column grows by the item's pack size × extra. **Fewer** packs take effect at the next renewal
   (`nextPacks`, new nullable column), no refund; refused like a removal when current usage would not fit
   (`CANNOT_DELETE_ADDON_LIMIT_EXCEEDED`). The same number again cancels a pending reduction. Paused row → 422
   `ADDON_PRICE_NOT_ON_SALE`; an old free item → 404 `ADDON_PRICE_NOT_FOUND`. Renewal uses `nextPacks ?? packs`.
   Admin: a packs field and the charge line on each item of the shop's Add-on page.
9. A smaller pack can leave a shop above a limit after renewal: nothing is deleted; the existing check blocks creating more.

10. **Mid-period charge** (owner decision, later on 2026-10-11; replaces #869's "× days left ÷ days of the period"):
    charge now = round(monthly price per pack after the cycle discount ÷ 30 × packs × Vietnam days left until
    `currentPeriodEnd`), whole VND. The period length no longer matters (an extended or early-renewed period with ~60
    days left charges ~2 months). Monthly: 40.000 ÷ 30 × 1 × 18 = 24.000 ₫. Trial / ended period: 0. One quote
    function (`calculateAddonQuote`) serves a purchase and "more packs". The quote adds `discountedMonthlyPrice`.

## Stripe / Lemon Squeezy — not changed

Both bill a fixed provider price (Stripe `price` id, Lemon `variant`); the code never computes the amount, and the
webhooks record what the provider charged (Lemon writes 0). Adding add-ons would mean new provider line items — a
payment-flow change. They are not live for these shops: the shop web's Lemon checkout is off
(`SUBSCRIPTION_UPGRADE_EXTEND_ENABLED = false`), and Stripe checkout is used only by admin "create subscription"
(a shop with no subscription has no add-ons). Left for the owner; noted in the PR.

## API compatibility (against `release-2026-10-11`)

| Area | Old callers | Verdict |
|---|---|---|
| `POST /extend`, `GET /extend/calculate` | admin `merchants/[id]/page.tsx:270`, `subscriptions/[id]/page.tsx:167`, `subscriptions/page.tsx:301`, `SubscriptionExtendDialogEnhanced.tsx:212`. iOS/Android: none | safe. Additive fields; `totalPrice`/auto amount include add-ons only for shops with priced add-ons (none on `main-real`) |
| `POST/PATCH /change-plan` | admin `subscriptions/page.tsx:225,258`, `utils/api/subscriptions.ts:150`. iOS/Android: none | safe. New 422 only for shops with branch add-ons; amount includes add-ons only for priced add-ons; `planChange` additive |
| `PUT /api/addon-prices/[id]` | new in #869 (not on the release tag) | safe |
| `GET /api/merchants/[id]/addons` | new in #869 | additive `renewal.addonPaidMonthlyTotal` |
| Stripe / Lemon routes | — | not touched |
| `PATCH /api/merchants/[id]/addons/[addonId]` | new in #869 | additive `packs` |
| Migration `20261013090000_addon_next_packs` | old code ignores it | additive: one nullable column `PlanLimitAddon.nextPacks` |
