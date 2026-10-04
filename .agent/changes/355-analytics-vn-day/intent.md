# Analytics, dashboard and order list days use the Vietnam civil day

Issue: #355 · Author: Trinh Tran · Status: in progress · Created: 2026-10-04

## Problem

Analytics treat a `YYYY-MM-DD` day as a UTC day (00:00Z–23:59Z), which is 07:00 → 06:59 the next day in
Vietnam. Anything between midnight and 7 am Vietnam time is counted on the previous day, or missed when the
range is a single day. Seen on 2026-10-02: the dashboard showed 7 new orders for a day with 9; "This month"
starts on 30/09. Daily and monthly buckets use `getUTCDateKey` and `Date.UTC(...)` windows in
`period-report.ts`, `income-period-summary.ts`, `analytics/income*` and `revenue-calculator.ts`.

## Proposed outcome

Every day and month in analytics, the dashboard and the order list date filter is a Vietnam civil day / month
(`Asia/Ho_Chi_Minh`). An order created at `2026-10-01T17:00:00Z` (00:00 on 2 Oct in Vietnam) is counted on
2026-10-02; one at `2026-10-01T16:59:59Z` on 2026-10-01. Stored values stay UTC.

## Affected users and systems

- Roles: `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` (dashboard, daily income), `ADMIN`.
- API: `analytics/enhanced-dashboard`, `analytics/period` (and its alias `analytics/overview`),
  `analytics/income`, `analytics/income/daily`, `analytics/income/orders`, `analytics/income/summary`,
  `analytics/orders`, `orders` (date filter).
- `packages/utils`: `period-report`, `income-period-summary`, `revenue-calculator`, `date-range`.
- Clients: web client dashboard and order list; iOS and Android overview read the same analytics.

## Constraints

- No schema change. Response shapes stay as they are (additive only); installed mobile apps keep working.
- Totals over a whole period do not change; only the day/month an event lands in changes.
- Cancelled orders stay excluded from revenue and rankings.
- Tests run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh` with events at 16:59:59Z and 17:00:00Z, and month edges.
- Mobile code is not changed here (another agent owns the mobile overview).

## Open questions

- None blocking. A `timeZone` query param is accepted (validated IANA name) for clients that want another zone.

## Decision log

- 2026-10-04 — Reuse `formatDateKeyInTimeZone` / `getCalendarDayRangeInTimeZone` from `core/date-range.ts` and add
  `getUtcRangeForDateKeys` (the name AGENTS.md and the `timezone-dates` skill already use) next to them, plus small
  day/month list helpers in the same file. No third helper set. (agent)
- 2026-10-04 — Response `date` keeps the `YYYY/MM/DD` format and `dateISO` keeps "civil date at 00:00Z", now built
  from the Vietnam day instead of the UTC day, so mobile labels stay the same shape. (agent)
