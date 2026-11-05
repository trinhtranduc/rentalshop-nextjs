# Plan — Gia hạn gói trên điện thoại (đợt 1)

Issue: #1459 · Status: in-progress · Spec: ./spec.md

## Steps

1. **Tests red first** (spec 1–3, 7–14): `tests/plan-renewal-rule.test.ts` (rule, product map, tier),
   `tests/api/revenuecat-webhook.test.ts` (authorised fixtures), `tests/api/lemonsqueezy-webhook-channel.test.ts`
   (signed fixtures), `tests/api/subscription-status-renewal-fields.test.ts`, golden
   `tests/api-compat/subscription-login-api-compat.test.ts` (status + login against `origin/main-real`). Commit red.
2. **Migration** (`db-migration`): `prisma/schema.prisma` + `prisma/migrations/20261102120000_subscription_store_billing/`.
   `yarn db:generate`, apply on the local DB.
3. **Rule** `apps/api/lib/plan-renewal.ts` (pure, import-light; `timezone-dates`: days come from `civilDaysBetween`).
4. **Routes** (`api-route-standard`): `apps/api/app/api/subscriptions/status/route.ts`, `apps/api/app/api/plans/route.ts`,
   `apps/api/app/api/webhooks/revenuecat/route.ts`, `apps/api/app/api/lemonsqueezy/webhook/route.ts`.
   History text helper in `apps/api/lib/plan-renewal-history.ts` (VN dates via `formatDateKeyInTimeZone`).
5. **LOG row** `.agent/api-changes/LOG.md` (planned → dev at merge).
6. **iOS** (`mobile-parity`, reference):
   - `Library/Managers/PurchasesManager.swift`: four products, packages per plan, upgrade-safe purchase, manage.
   - `Model/PlanRenewal.swift` (pure logic: display names, button title, disclosure, monthly price, savings, home line,
     expiry decision) + `POS ADBDTests/PlanRenewalLogicTests.swift` (red first).
   - `Model/SubscriptionStatusInfo.swift` new optional fields; `Library/Services/SubscriptionAPIService.swift` plans.
   - `Viewcontrollers/Settings/SubscriptionViewController.swift` rewritten to the approved layout, also used in
     expired mode; `SubscriptionExpiredGate` (AppDelegate root swap, 403 hook in `AuthSession.swift`).
   - Settings rows: `SettingsViewController.swift` (flag removed), `SettingsV2ViewController.swift` (owner opens).
   - Home line: `ProductsHomeViewController` (v2 Home) via a small reusable view.
   - Strings `en.lproj`, `vi-VN.lproj`. `Configuration/AnyRentSubscriptions.storekit`: add Professional products.
7. **Android** (match iOS): `billing/PurchasesManager.kt`, `domain/settings/PlanRenewal.kt` + unit test,
   `data/model/Models.kt`, `data/ApiClient.kt` (status fields, plans, 403 hook → `SessionStore`),
   `ui/settings/SubscriptionScreen.kt` (rewritten, expired mode), nav route for the expired screen
   (`ui/navigation/AnyRentNavHost.kt`), Settings rows (`SettingsScreens.kt`, `v2/SettingsV2Screen.kt`), Home line
   (`ui/home/v2/ProductsHomeScreen.kt`), strings `values`, `values-vi`.
8. **E2E** (`mobile-e2e-local`, visible): own Postgres DB, local API, iOS UI test with `SKTestSession` (storefront VNM)
   and a simulated signed webhook; Android AVD with a window, screens and states with a simulated webhook.
9. **Verify** (`verify-change`): `yarn lint`, `yarn type-check`, API build (`SKIP_ENV_VALIDATION=true`), Jest under
   `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`, iOS `POS ADBDTests`, Android `:app:testDebugUnitTest :app:assembleDebug`.

## Files

- `prisma/schema.prisma`, `prisma/migrations/…_subscription_store_billing/` — columns + event table
- `apps/api/lib/plan-renewal.ts`, `apps/api/lib/plan-renewal-history.ts` — rule, product map, history text
- `apps/api/app/api/{subscriptions/status,plans,webhooks/revenuecat,lemonsqueezy/webhook}/route.ts`
- `tests/…` — listed in step 1
- `apps/mobile/POS ADBD/…`, `apps/mobile/POS ADBDTests/…`, `apps/mobile/POS ADBDUITests/…`
- `apps/mobile-android/app/src/{main,test}/…`
- `.agent/api-changes/LOG.md`

## Risks

- Webhook now changes the plan: an owner on Professional buying a Basic product (only old Aug builds offer it) becomes
  Basic. Recorded in the compat table.
- 500 instead of 200 on a processing error makes RevenueCat retry; idempotency keeps the retry single.
- Apps: a missed expiry signal leaves the old per-screen error (same as today), never a crash.
- Android without a RevenueCat key: purchase unavailable text; restore disabled.

## Rollback

Revert the PR. The migration is additive: the columns and table can stay; old code ignores them.
