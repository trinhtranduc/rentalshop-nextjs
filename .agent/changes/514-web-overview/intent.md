# Shop web Tổng quan in the new design

Issue: #514 · Author: Claude for Trinh · Status: accepted · Created: 2026-10-06

## Problem

The shop web dashboard (`apps/client/app/dashboard/page.tsx`, about 1,700 lines) still uses the old card grid. It also calls five analytics endpoints and shows numbers that no longer match the mobile Overview:
- `todayPickups` is always 0;
- it has no outstanding or collateral breakdown.

The approved "Tổng quan" board on the web redesign canvas shows the money and the day's work the way the mobile app already does (#492, #494, #496).

## Proposed outcome

`/dashboard` renders the board with live data from two existing endpoints:
- `/api/analytics/period` for value, collected, outstanding, collateral, series and top products;
- `/api/analytics/outlet-operations` for today's work, today's order rows, tomorrow, and the upcoming collateral.

## Affected users and systems

- Roles: MERCHANT, OUTLET_ADMIN, and OUTLET_STAFF. OUTLET_STAFF sees the work only, with no money.
- Apps: `apps/client` only. There is no API, schema, mobile or admin change.

## Constraints

- Vietnam civil days, with tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
- Cancelled orders stay out of value and rankings (the API already excludes them).
- Users without full analytics access keep today only.
- New strings go in all five locales.
- Colours use the `ar-*` tokens from #509 so dark mode works.

## Decision log

- 2026-10-06 — Plan approved ("chốt"); phase 2 is Tổng quan. (Trinh)
- 2026-10-06 — Default chosen: for "Hôm nay" the chart still shows the last 7 days, because a single bar says nothing. (Claude)
- 2026-10-06 — Default chosen: the old quick-add dialogs and the year and 30-day periods are dropped. They are not on the board, and "Tuỳ chọn" covers any range. (Claude)
