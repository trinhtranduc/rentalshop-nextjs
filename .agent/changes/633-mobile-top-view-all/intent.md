# Mobile Tổng quan: "Xem tất cả" for Top sản phẩm / Top khách hàng

Issue: #633 · Author: Trinh Tran · Status: accepted · Created: 2026-10-07

## Problem

Mobile Tổng quan shows only the first 5 of Top sản phẩm and Top khách hàng and no way to see more. The shop web
already has "Xem tất cả" (#620, `apps/client/app/dashboard/overview/TopDrawer.tsx`, `TOP_ALL_LIMIT = 50`).

## Proposed outcome

On iOS and Android each top card has "Xem tất cả" when it has rows. It opens the period's ranking, up to 50 rows,
same period, same order and same row look as the card. Tapping a row does what the card row does (that product's /
customer's orders in the period).

## Affected users and systems

Roles that see Tổng quan today (unchanged). iOS, Android. `GET /api/analytics/period` (iOS) and
`GET /api/analytics/overview` (Android), both `limit` max 50; unchanged.

## Constraints

No API change. iOS is the reference. Keep it lean: no paging past 50, no sort switch.

## Open questions

- none

## Decision log

- 2026-10-07 — web and mobile both; web already done on dev (#620) (owner)
- 2026-10-07 — 50 rows, same as web and the API cap (agent proposal; owner asked for a proposal between 20 and 50)
