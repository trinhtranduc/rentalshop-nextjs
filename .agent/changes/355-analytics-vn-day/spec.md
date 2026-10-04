# Spec — Analytics, dashboard and order list days use the Vietnam civil day

Issue: #355 · Status: in progress · Intent: ./intent.md

## Behavior

1. `getUtcRangeForDateKeys({ from, to }, timeZone = 'Asia/Ho_Chi_Minh')` returns the UTC bounds of civil days
   `from`..`to`: `2026-10-02` → `2026-10-01T17:00:00.000Z` … `2026-10-02T16:59:59.999Z`.
2. `revenue-calculator`: "same day" (same-day pickup / return) compares Vietnam day keys; `getOrderRevenueForDate`,
   `getRevenueByDate` and `calculatePeriodRevenue` use the Vietnam day of the target date and of "now", whatever
   the server `TZ` is.
3. `computeIncomePeriodSummary` (`income/summary`, `period` operational, `period` day series): the window of
   `startDate..endDate` is Vietnam days; each event is bucketed by its Vietnam day. An event at 16:59:59Z lands on
   that date, one at 17:00:00Z on the next date. Rows keep `date: 'YYYY/MM/DD'` and `dateISO: 'YYYY-MM-DDT00:00:00.000Z'`.
4. `buildAnalyticsPeriodReport` (`analytics/period`, `analytics/overview`): range, previous period, day series and
   month series use Vietnam days and months (October = `2026-09-30T17:00Z` … `2026-10-31T16:59:59.999Z`).
   The day series starts on `startDate`, not the day before.
5. `analytics/enhanced-dashboard`: `startDate=endDate=D` counts orders created in Vietnam day D; the comparison
   period is the previous Vietnam month (same-month range) or the previous Vietnam year; "today pickups" start at
   Vietnam midnight of D.
6. `analytics/income` (`groupBy=day|month`), `analytics/income/daily`, `analytics/income/orders`, `analytics/orders`:
   windows and bucket keys are Vietnam days / months. Labels keep their formats (`dd/mm/yy`, `mm/yy`,
   `YYYY/MM/DD`, `YYYY/MM`).
7. `orders` list: `startDate`/`endDate` as `YYYY-MM-DD` filter Vietnam days (kept from #350); an ISO instant filters
   the Vietnam day that contains it.
8. Every route above accepts an optional `timeZone` (IANA); an unknown zone returns 400 `INVALID_QUERY`. Default
   `Asia/Ho_Chi_Minh`.
9. The sum of the day buckets over a range equals the period total for that range; no event is lost or counted twice.
10. `CANCELLED` orders stay excluded from revenue rankings (#361 guard unchanged).

## Out of scope

- Mobile code (iOS / Android). Callers are listed in `plan.md`.
- Other routes that call `normalizeStartDate` / `normalizeEndDate` (exports, subscriptions, audit logs).
- Changing the revenue rules themselves.

## API and data

No new required fields, no removed fields, no schema change. New optional query param `timeZone` on the routes in
behavior 8. Auth wrappers and merchant/outlet scope unchanged.

## Acceptance

- [x] Each behavior line has a test named in `plan.md`
- [x] iOS and Android called out (response shape unchanged; day meaning changes)
- [x] No new user-facing strings (reuses `INVALID_QUERY`)
- [x] Cancelled orders, Vietnam civil days, and role limits still hold where they apply
