# Plan — Cancel after an App Store upgrade; no auto-renew card on the plan screen

Issue: #1466 · Status: in-progress · Spec: ./spec.md

## Steps

1. Red tests (`bug-fix-tdd`): `tests/api/revenuecat-webhook-cancel-after-upgrade.test.ts` (spec 2–7); the old
   expectation in `tests/api/revenuecat-webhook.test.ts` ("a cancel or expiration of an older product after an upgrade
   does not turn auto-renew off", App Store, same original transaction id) encodes the bug: it becomes the Google Play
   case (spec 7). Commit the tests alone, then `FIX_MODE=1`.
2. Fix: `apps/api/app/api/webhooks/revenuecat/route.ts`, `isCurrentProduct` → `isCurrentSubscription(sub, event)`
   (spec 1) at its three call sites.
3. `.agent/api-changes/LOG.md` row (planned → dev).
4. Apps (`mobile-parity`, iOS first):
   - iOS `Viewcontrollers/Settings/SubscriptionViewController.swift`: drop `addAutoRenew` / `autoRenewAmount` and their
     calls; the CHỌN GÓI subtitle says `plan.current`; the products load no longer waits for auto-renew alone.
     `Model/PlanRenewal.swift`: drop `autoRenewDate`. Strings `en.lproj`, `vi-VN.lproj`.
   - Android `ui/settings/SubscriptionScreen.kt`, `domain/settings/PlanRenewal.kt`, `res/values{,-vi}/strings.xml`.
   - Tests: `PlanRenewalLogicTests.swift`, `PlanRenewalTest.kt` (the auto-renew date test becomes "Dùng đến stays the
     period end"), hosted e2e `PlanRenewalHostedE2ETests.swift` and `scripts/mobile-e2e/plan-renewal-e2e.sh` (no
     auto-renew row; "Dùng đến" checked instead).
5. Verify (`verify-change`): Jest suites under both TZ, `yarn lint`, type-check of `apps/api`; iOS `POS ADBDTests`;
   Android `:app:testDebugUnitTest :app:assembleDebug`; `plutil -lint`, `xmllint`, line counts.
6. Screenshots, owner active with a store plan, both platforms → `~/Documents/AnyRent-shots/cancel-after-upgrade/`.

## Files

- `apps/api/app/api/webhooks/revenuecat/route.ts` — matching rule
- `tests/api/revenuecat-webhook-cancel-after-upgrade.test.ts`, `tests/api/revenuecat-webhook.test.ts` — red tests
- iOS / Android files above — card removal
- `.agent/api-changes/LOG.md` — compat row

## Risks

- An App Store event for the upgraded-away product that is not about the subscription (not documented by RevenueCat)
  would now apply. CANCELLATION / EXPIRATION never cut access before the period end; a refund still needs the period's
  expiry (A10); the next RENEWAL / UNCANCELLATION restores auto-renew.
- Play: unchanged by design.
- Apps: only removals; the A6 re-enable card, the disclosure and the footer are untouched.

## Rollback

Revert the PR. No data migration; rows written meanwhile stay correct (auto-renew off for owners who cancelled).
