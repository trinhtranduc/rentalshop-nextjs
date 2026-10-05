# Plan — Android overview "New orders" title and returned step bar

Issue: #434 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests: `OverviewLinksTest` (title of "new"), `OrderDetailLogicTest` (progress days).
   Extract `OverviewLinks.listTitle` and `OrderDetailLogic.progressDays` with today's behavior; commit.
2. Fix: `listTitle("new")` → `overview_v2_new_orders`; `progressDays` prefers actual days;
   `pickedUpAt` / `returnedAt` on `OrderSummary`, parsed in `ApiClient.parseOrderSummary`.
3. Skills: `bug-fix-tdd`, `mobile-parity` (Android only, iOS already right), `timezone-dates`.
4. Verify: `./gradlew :app:testDebugUnitTest :app:assembleDebug`.

## Files

- `apps/mobile-android/.../domain/overview/OverviewLinks.kt` — list title per kind
- `apps/mobile-android/.../ui/navigation/AnyRentNavHost.kt` — use it
- `apps/mobile-android/.../domain/orders/OrderDetailLogic.kt` — progress days
- `apps/mobile-android/.../ui/orders/v2/OrderDetailV2Screen.kt` — use it
- `apps/mobile-android/.../data/model/Models.kt`, `data/ApiClient.kt` — parse actual days

## Risks

Low. New fields are optional with null defaults.

## Rollback

Revert the PR.
