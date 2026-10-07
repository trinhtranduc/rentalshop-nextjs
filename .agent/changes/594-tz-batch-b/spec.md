# Spec — Timezone batch B (#594, spec §B of #578)

Day D (VN) = `[D-1 17:00Z, D 16:59:59.999Z]`. Inputs: a key is that day; an instant at `23:59:59[.fff]Z` is its
written (UTC) date; any other instant is the VN day containing it.

- B1 `packages/utils` date-range: `normalizeStartDate`/`normalizeEndDate` return VN day bounds;
  `getDateRangeFromPeriod` ends at the end of VN today; `validateDateRange` measures "future" from VN today
  (+1 day grace kept); `parseDateRangeFromQuery` uses them. Names/signatures unchanged.
- B2 `excel.ts`: `formatDateForExcel` prints VN wall time (optional `timeZone` arg); file names use VN keys.
  Exports (orders, customers, products, users, merchants): same rows as the list for the same filter
  (orders export also skips soft-deleted orders like the list).
- B3 Routes on VN days: analytics today-metrics, dashboard (today), growth-metrics (current/previous VN months),
  top-products, top-outlets, top-customers, overview statistics, system (+ trend buckets/labels), recent-orders,
  enhanced-dashboard (todayPickups ≤ end), customers/[id]/orders (list and money total share bounds),
  merchants/[id]/orders, orders/cursor, orders/statistics, calendar/orders meta range, calendar/orders/count
  default year. `getStatistics.totalRevenue` excludes CANCELLED.
- B4 Overdue = status PICKUPED and returnPlanAt < start of VN today (today-metrics, orders/stats, calendar count).

Tests: 16:59:59Z / 17:00:00Z boundaries, month/year edges, under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
