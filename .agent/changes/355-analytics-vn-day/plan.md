# Plan — Analytics, dashboard and order list days use the Vietnam civil day

Issue: #355 · Status: in progress · Spec: ./spec.md

## Steps

1. Failing tests first (`bug-fix-tdd`), committed alone as `test(api): …`:
   - `tests/packages/utils/analytics-vn-day.test.ts` — spec 1–4, 9 (helpers, revenue-calculator, income summary,
     period report) with events at 16:59:59Z / 17:00:00Z and a month edge.
   - `tests/api/analytics-vn-day-routes.test.ts` — spec 5–8 (enhanced-dashboard, period, income, income/daily,
     income/orders, analytics/orders, orders list).
   - Run both under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
2. `packages/utils/src/core/date-range.ts`: add `getUtcRangeForDateKeys`, `toDateKeyInTimeZone`,
   `addDaysToDateKey`, `listCivilDays`, `listCivilMonths`, `civilDayBucket` on top of
   `formatDateKeyInTimeZone` / `getCalendarDayRangeInTimeZone`.
3. `packages/utils/src/core/revenue-calculator.ts`: Vietnam day keys and bounds.
4. `packages/utils/src/analytics/income-period-summary.ts`, `period-report.ts`: Vietnam windows, buckets, months,
   previous period; optional `timeZone`.
5. Routes: `analytics/enhanced-dashboard`, `analytics/period`, `analytics/overview`, `analytics/income`,
   `analytics/income/daily`, `analytics/income/orders`, `analytics/income/summary`, `analytics/orders`, `orders`.
   Shared query reading in `apps/api/lib/analytics-days.ts` (time zone + day keys).
6. Eval case `.agent/evals/cases/355-analytics-vn-day.md`.
7. Domain skills: `timezone-dates`, `api-route-standard`, `mobile-parity`.
8. Verify: `cd tests && yarn test` vs baseline, both TZ runs of the new files,
   `npx tsc --noEmit -p apps/api/tsconfig.json`, API build.

## Files

- `packages/utils/src/core/date-range.ts` — Vietnam-day range and bucket helpers
- `packages/utils/src/core/revenue-calculator.ts` — same-day and per-date logic in Vietnam days
- `packages/utils/src/analytics/income-period-summary.ts`, `period-report.ts` — windows and buckets
- `apps/api/lib/analytics-days.ts` — read `timeZone` / day keys from a query
- `apps/api/app/api/analytics/**/route.ts`, `apps/api/app/api/orders/route.ts` — use the helpers

## Callers

- Web client: dashboard and order list send `YYYY-MM-DD` keys (checked in this change; see PR notes).
- iOS `AnalyticsAPIService`, Android overview: response shape unchanged; buckets now follow the Vietnam day,
  which is what both apps already display. No mobile change in this PR.

## Risks

- Day/month totals move by up to 7 hours of events at the edges; whole-period totals do not change.
- Mobile labels: `date`/`dateISO` formats unchanged.

## Rollback

Revert the fix commit; no data or schema change.
