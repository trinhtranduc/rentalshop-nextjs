# Intent — Period report: expected collections, new order value per day, rent/sale split (#605)

## What
`GET /api/analytics/period` returns three additive fields the redesigned Tổng quan (web, iOS, Android) needs:
expected collections per day (hatched "dự kiến" bars), new order value per day (tile sparkline) and the
rent / sale split of the new order value (tile detail sheet).

## Why
The new dashboard cannot draw these from the current payload. `series[].futureIncome` cannot be reused:
old Android adds it to the revenue bar (`OverviewScreen.kt:565` on `main-real`).

## Constraints
- Additive only. No existing field changes value or meaning; `futureIncome` stays `0` for daily series.
- Civil days of the report's `timeZone` (default `Asia/Ho_Chi_Minh`); `CANCELLED` excluded;
  merchant / outlet scope as the route already applies.
- One extra query, only when the range reaches today; a failure in the new code never fails the response.

## Out of scope
Consumers (web dashboard, iOS, Android) — follow-up issues.
