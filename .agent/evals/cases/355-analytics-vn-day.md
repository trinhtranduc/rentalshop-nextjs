# analytics: a day or month read as the UTC day instead of the Vietnam day

Status: active · Added: 2026-10-04 · Source: #355

## Failure

- `analytics/enhanced-dashboard`, `period` / `overview`, `income`, `income/daily`, `income/orders`, `income/summary`
  and `analytics/orders` turned `YYYY-MM-DD` into `T00:00:00.000Z` … `T23:59:59.999Z` and bucketed events with
  `getUTCDateKey` / `Date.UTC(y, m, 1)`. Orders made between 00:00 and 07:00 in Vietnam landed on the previous day
  (or the previous month on the 1st). "Today" showed 7 new orders for a day with 9; "This month" started on 30/09.
- `revenue-calculator` decided "same-day pickup / return" by the UTC day and `getRevenueByDate` used the server's
  `setHours(0,0,0,0)`.
- The web dashboards built the keys with `toISOString().split('T')[0]`: yesterday before 7 am, and a month that
  started one day early.
- Same bug class as `vn-civil-day.md`, second time for analytics.

## Detect

```bash
cd tests
TZ=UTC yarn test packages/utils/analytics-vn-day api/analytics-vn-day-routes
TZ=Asia/Ho_Chi_Minh yarn test packages/utils/analytics-vn-day api/analytics-vn-day-routes
```

Grep the diff of any analytics or order-filter change for `getUTCDateKey`, `normalizeStartDate`, `normalizeEndDate`,
`'T00:00:00.000Z'`, `'T23:59:59.999Z'`, `Date.UTC(` and `toISOString().split`.

## Pass

Both runs green with identical results. `2026-10-02` means `2026-10-01T17:00:00Z` … `2026-10-02T16:59:59.999Z`;
an event at 16:59:59Z is on that date and one at 17:00:00Z on the next. October is
`2026-09-30T17:00Z` … `2026-10-31T16:59:59.999Z`. Sum of day buckets = period total. Response `date`
(`YYYY/MM/DD`) and `dateISO` (`YYYY-MM-DDT00:00:00.000Z`) keep their formats.

## Notes

Helpers: `getUtcRangeForDateKeys`, `toDateKeyInTimeZone`, `listCivilDays`, `listCivilMonths`, `civilDayBucket`
in `packages/utils/src/core/date-range.ts`; routes read `timeZone` / dates with `apps/api/lib/analytics-days.ts`.
Skill: `.claude/skills/timezone-dates/SKILL.md`.
