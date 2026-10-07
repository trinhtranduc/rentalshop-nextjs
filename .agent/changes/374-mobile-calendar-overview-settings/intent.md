# Mobile calendar, overview and settings

Issue: #374 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The Calendar tab shows one count per day and does not tell hand-overs, returns and late returns apart. The Overview
tab is a long chart page with fixed periods, and its numbers are hard to compare with the web dashboard. Settings is
a list of tools grouped differently on each app, with the plan and the language hidden.

## Proposed outcome

With the `newCalendar`, `newOverview` and `newSettings` app-config flags on, both apps show the canvas design
(artifact DY4DRyDH8Kps9gAw9FExLx, boards Lich, Tong-quan, Tong-quan-chon, Cai-dat). With a flag off, that tab stays
as it is today.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. Reads `GET /api/calendar/orders/count`,
`GET /api/calendar/orders/by-date`, `GET /api/analytics/period`, `GET /api/analytics/outlet-operations`,
`GET /api/subscriptions/status`; `POST /api/auth/change-password`. No API change.

## Constraints

- Installed apps and users without a flag keep the current tab.
- Days are `YYYY-MM-DD` keys in the device time zone; calls send `timeZone` where the route takes it.
- Overview needs `analytics.view.revenue` for money; `OUTLET_STAFF` sees only what the API lets it see.
- The server's day bucketing of `analytics/period` is fixed in #355; the contract does not change.

## Open questions

- None.

## Decision log

- 2026-10-04 — Plan approved as part of #363 phase 4 (Trinh Tran)
- 2026-10-04 — Settings rows open the existing sub-screens; a row whose screen does not exist on a platform is left out
  (iOS has no customer list) (agent)
