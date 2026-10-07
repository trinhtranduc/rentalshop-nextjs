# Plan — Timezone audit fixes (one PR per batch, in this order)

Skills: `bug-fix-tdd` (failing test committed first, then FIX_MODE=1), `timezone-dates`, `api-compat-review`,
`api-route-standard`, `mobile-parity`, `verify-change`, `review-pr`, `release-review` (owner go only).

Every PR:
1. Branch `fix/<issue>-<slug>` from `origin/dev`.
2. Commit the failing tests alone.
3. Fix.
4. Full Jest under both TZ, `scripts/e2e/business-e2e.sh`, the date round-trip e2e (web + API) once merged,
   lint, type-check, API build.
5. PR body: compat table, before/after numbers on the seeded DB, findings closed.
6. Owner reviews and merges → runs on dev-api → spot check → production only via release-review.

| # | Batch | Main files | Extra checks | Rollback |
|---|---|---|---|---|
| 1 | A availability | `apps/api/app/api/products/availability/route.ts`, `products/batch-availability/route.ts`, `apps/api/lib/availability*.ts` | replay old iOS/Android request shapes; web Tạo đơn + mobile cart on the local stack | revert PR |
| 2 | B reports (after #567 phase 1) | `packages/utils/src/core/date-range.ts`, `excel.ts`, analytics routes, export routes, `packages/database/src/order.ts` (exact bounds) | before/after per route on seed; totals = list sums | revert PR |
| 3 | D shop web | `apps/client/app/**` (useShopToday, OrderEditor edit payload, renewal bar) | browser e2e with clock fast-forward | revert PR |
| 4 | C admin | `apps/admin/**`, `packages/ui` date filter/picker/subscription form, `packages/hooks/useProductAvailability`, date formatters | admin in UTC and Los Angeles browsers | revert PR |
| 5 | E billing/mail/cron | subscription routes/helpers, `email.ts`, `packages/loyalty/src/expiry.ts` | owner confirms the month clamp; no cron run against production | revert PR |
| 6 | F mobile | iOS `RCExtentions`, `DesignTokens`, Cart, RentalExtension, OrdersHome…; Android `OrderPlanDays`, CartStore, RentalExtension, repositories/view models | XCTest + JUnit with phone zone Tokyo/LA/UTC; builds; `mobile-e2e-local` | next build; API unaffected |

Not done by agents: production deploy, production database, store submission, backfill of existing orders.
