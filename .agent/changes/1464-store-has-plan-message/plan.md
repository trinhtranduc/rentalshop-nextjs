# Plan — Store already has a plan: calm message; compact plan-screen links

Issue: #1464 · Status: in-progress · Spec: ./spec.md

## Steps

1. Red tests: `apps/mobile/POS ADBDTests/PlanRenewalLogicTests.swift`,
   `apps/mobile-android/app/src/test/java/com/anyrent/pos/domain/settings/PlanRenewalTest.kt` (message choice, links per
   channel). Commit alone.
2. Logic: `PlanRenewal.swift` / `PlanRenewal.kt` (`storeKeptCurrentPlan`, slow message, `footerLinks`).
3. Purchase result: iOS `PurchasesManager.swift` returns `.storeKeptPlan`; Android `PurchasesManager.kt` helper reads the
   returned `CustomerInfo`.
4. Screens: `SubscriptionViewController.swift`, `SubscriptionScreen.kt` (slow text, footer per channel, auto-renew card).
5. Strings (`i18n-keys`, `mobile-parity`): iOS `vi-VN.lproj` / `en.lproj`; Android `values-vi` / `values`.
6. Verify (`verify-change`): iOS `POS ADBDTests` on a dedicated simulator + build; Android
   `:app:testDebugUnitTest :app:assembleDebug`; API diff empty.
7. Screenshots before / after (iPhone, Android; active, expired) to `~/Documents/AnyRent-shots/store-has-plan/`.

## Files

- iOS: `Model/PlanRenewal.swift`, `Library/Managers/PurchasesManager.swift`,
  `Viewcontrollers/Settings/SubscriptionViewController.swift`, `*.lproj/Localizable.strings`, `POS ADBDTests/PlanRenewalLogicTests.swift`
- Android: `domain/settings/PlanRenewal.kt`, `billing/PurchasesManager.kt`, `ui/settings/SubscriptionScreen.kt`,
  `res/values*/strings.xml`, `test/.../PlanRenewalTest.kt`

## Risks

- A wrong "store kept the plan" reading only changes the slow-state text; polling still confirms a real payment.
- The hosted e2e test finds the restore link by id `plan.restore`; the id stays on both labels.

## Rollback

Revert the PR; mobile only, no data.
