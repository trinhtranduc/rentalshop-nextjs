# Spec: admin add-ons per shop

Read on `origin/dev` 24ca32bc8 and `origin/main-real` 12a94b78b. Mockup: tab "★ Admin: add-on theo shop" in artifact 9b56KwErJWiGpiyFEfyEY4.

## 1. Reuse or restart #782

**Verdict: restart the code from `origin/dev`. Do not continue `feat/782-modules`. Keep this folder, and reuse #782 by reopening it after the owner's "chốt". No new feature issue.**

- #782 is closed as completed. Its last comment says priced add-ons were replaced by #850 (PR #869, merged). The branch has no PR.
- The branch is 15 commits ahead and 1264 behind `origin/dev`, from 2026-10-11.
- Its model conflicts with what shipped. It adds `BillingModule` and its own `MerchantModule` with other columns (branch `prisma/schema.prisma:1094,1116`), while dev already has `MerchantModule` from #907 (`prisma/schema.prisma:1186`). The two definitions of `MerchantModule` cannot both exist, and attendance and loyalty depend on the one on dev.
- It answers 410 on the old add-on routes and moves limits to a new table. Production uses `AddonPrice` + `PlanLimitAddon` instead.
- Its useful rules (one kind per item, proration, removal at period end) are already live through #850.

## 2. What already runs

The add-on files below have no diff between `origin/dev` and `origin/main-real`.

| Need | Today | Where |
|---|---|---|
| Price list per kind | `AddonPrice`: kind, `packSize`, VND per pack per month, on sale or paused | `prisma/schema.prisma`, admin `/plans/addon-prices` |
| Add to a shop, one kind per item | `POST /api/merchants/[id]/addons`, price from the list, payment written | `apps/api/lib/merchant-addons.ts`, `packages/database/src/addon-price.ts` |
| Branches on any plan | #1187 | `apps/api/lib/merchant-addons.ts` |
| Products and orders kinds | Same flow, typed "number of packs" × a fixed `packSize` | `packages/utils/src/core/addon-pricing.ts` |
| Loyalty as a paid module | Feature row, refused when the plan already includes it | `merchant-addons.ts`, `ADDON_FEATURE_IN_PLAN` |
| Period and money | Charge now = price ÷ 30 × quantity × Vietnam days left; renews with the subscription; "Gỡ cuối kỳ" | `calculateAddonQuote`, `addonRenewalLines` |
| Enforcement | Plan + sum of un-ended add-ons, on create | `packages/utils/src/core/validation/plan-limits.ts`, `check-plan-limit.ts` |

## 3. The four gaps (this change)

**G1. Admin types the amount.** A list row with `packSize = 1` means "price per one unit", and the typed number goes into `packs`: +100 products = 100 × the row's price. No new column. Renewal stays correct, because `addonRenewalLines` takes `packSize` from the list row and that row stays 1.
- Admin price list: new limit rows default to `packSize = 1`, price label "Giá cho 1 sản phẩm". Older rows with a larger pack keep working and keep the "Số gói" wording.
- `packs` maximum goes from 1,000 to 100,000 in `merchantAddonCreateSchema`, `merchantAddonUpdateSchema`, `addonQuoteQuerySchema` (`addon-pricing.ts:253,265,275`). The inputs at `apps/admin/app/merchants/[id]/addons/page.tsx:249,589` accept 6 digits.
- Labels: "Số sản phẩm cộng thêm" instead of "Số gói", "+100 sản phẩm" instead of "× 100".

**G2. One add dialog.** On the shop's Add-on tab, "+ Thêm add-on" opens one dialog with add-on, typed amount, price, period, charge now, and how it was paid. It replaces the left card and the second confirm dialog. Same quote and POST routes. If the plan is unlimited for that kind, the dialog says so and blocks the button, because the add-on would change nothing (`calculateTotalLimit`, `plan-limits.ts`).

**G3. Loyalty is really paid and really switches on.**
- Buying only opens the module gate. `LoyaltyProgram.isActive` starts false (`packages/database/src/loyalty-provision.ts`) and earning stops while it is false (`packages/loyalty/src/order-hooks.ts:192`). Today admin must also use a second switch on the merchant page. Change: `merchantAddons.add` provisions the program and sets `isActive = true` in the same transaction for `featureKey = loyalty`.
- Remove the free "Bật Khách thân thiết" button (`addons/page.tsx:302`, #1187). Shops already on keep it, and "Tắt" stays. Route `PUT /api/merchants/[id]/modules/loyalty` stays. This is an assumption from "paid module"; the owner can object.

**G4. The shop sees its real limit.** `GET /api/subscriptions/status` returns plan limits only (`route.ts:227`) and no order usage (`route.ts:228`), so web Settings shows the plan number even after an add-on. Add new fields `effectiveLimits`, `addonLimits`, `usage.orders`. Never change `limits`. Web uses `effectiveLimits ?? limits` (`apps/client/app/settings/SubscriptionTab.tsx:97`) and shows "gồm +100 add-on" (new key in 5 locales). If `getPlanLimitsInfo` fails, the fields are left out and the screen works as today.

## 4. API compatibility against `origin/main-real`

| Route / area | Change | Old iOS | Old Android | Web | Risk |
|---|---|---|---|---|---|
| Limit enforcement (`assertPlanLimit`) | Code unchanged. A shop with a block gets 200 instead of 422 until the new limit | `Model/ErrorCodes.swift:114,1482`; calls `POST /api/orders` (`apps/api/app/api/orders/route.ts:731`), products (`route.ts:622`) | `domain/error/ApiErrorMessages.kt:306` | Same code | Low. Same error code when full |
| Item ends or is not renewed | Unchanged. Over limit: nothing deleted, creating is refused | As above | As above | As above | Low. Already live |
| `GET /api/subscriptions/status` | Additive fields | `Model/SubscriptionStatusInfo.swift:10-18` decodes 7 named fields; extras ignored | `domain/settings/SettingsRows.kt:110`, `data/ApiClient.kt:1203` read named fields | `SubscriptionTab.tsx:97`, `subscription-model.ts:136`; ships with the API | Low. Up to 6 more counts per call; try/catch |
| `/api/merchants/[id]/addons*`, `/api/addon-prices*` | Higher `packs` maximum | No callers (`git grep` 0) | No callers (`git grep` 0) | Admin only | None |
| Loyalty program on purchase | `isActive = true` only for shops that buy | `Model/User.swift:178` reads `merchant.modules`; loyalty shows as for any plan with it | `domain/customers/CustomerRules.kt:235` shows the tier; no earn or redeem screen | `/loyalty` | Low. Only shops admin chooses |
| `merchant.modules` on login and profile | Unchanged | `User.swift:178` | `domain/attendance/AttendanceLogic.kt:121` | | None |
| Migration | None | | | | None |

Each implementation PR adds the `## API compatibility` table and a row in `.agent/api-changes/LOG.md`. Mobile code does not change.

## 5. Decisions for the owner

1. **Price of a typed amount.** Recommended: list price per unit × typed number, so admin never types money. Alternative: admin types a price per add; that needs a per-item price rule at renewal, which today resets to the list price.
2. **Period.** Recommended: the item starts now, is charged for the days left, and renews or ends with the shop's plan period. Alternative: an end date per item; that needs a second renewal path.
3. **Order blocks.** Orders are counted all-time, not per month (`entity-counts.ts`: every non-deleted order). A +500 block is capacity billed monthly, and once used it cannot be removed (`CANNOT_DELETE_ADDON_LIMIT_EXCEEDED`). Recommended: keep this and tell shops. Alternative: count per month, a platform-wide rule change on its own issue.
4. **Who can buy loyalty.** Pro and Enterprise include it, so only Trial and Basic can buy (`packages/constants/src/subscription.ts`). Basic has no web, and rates are set only on web `/loyalty`. Android has no earn or redeem screen. Recommended: sell it with a warning in the dialog, and put phone settings on #1309. Alternative: do not sell to Basic until then, which leaves almost no buyers.

**Owner's answers, 2026-10-31 (final, these override the recommendations above):**
1. Price = list price per unit × typed amount. Admin never types money.
2. An add-on starts now, is charged for the days left, and renews or ends with the shop's plan. No separate end date.
3. Order blocks stay all-time capacity, not monthly, and cannot be removed once used. Shown plainly to admin in the dialog and to the shop.
4. Loyalty is **not** sold to Basic until it can be set up on the phone: hidden from the choices with one line why, and refused by the API (`ADDON_LOYALTY_NOT_FOR_BASIC`). Pro and Enterprise include it, so in practice only Trial can buy.

A plan is Basic when its `name` contains "basic", any case (`isBasicPlanName`). `Plan` has no tier column; `limits.allowWebAccess` does not separate Basic (true in production) and Trial has no web feature either; this is the rule the RevenueCat webhook already uses (`apps/api/app/api/webhooks/revenuecat/route.ts:257-258`). A plan renamed without that word would not be recognised.

## 6. Not in scope

Merchant self-purchase, payment providers, forecasts, a limit screen on the phone (the phone gets the higher limit at once, with no display), per-shop discounts.

**Found, not fixed here (#1396):** `POST /api/products/bulk-import`, `POST /api/merchants/[id]/products` (`route.ts:131`) and `POST /api/merchants/[id]/orders` (`route.ts:214`) do not call the limit check, so a shop can pass its limit through them. Installed apps do not call these on `main-real`. Adding the check is a rule change with its own review.

## 7. Not verified

- Production rows: which `AddonPrice` rows exist, real plan limits and features, and `allowWebAccess` for Basic. No one connects to production. Basic being phone-only comes from the owner and `packages/auth/src/platform-access.ts`.
- "Android has no earn or redeem screen" comes from a search for `loyalty` in the Android source on `main-real` (only `CustomerRules.kt`, `ApiErrorMessages.kt`, one string), not from running the app.
- Which web screens call `POST /api/products/bulk-import`.
- Nothing was run against an API; this is a code reading. Mockup prices are illustrative.
