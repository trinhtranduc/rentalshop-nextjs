# iOS Tổng quan redesign (phone boards)

Issue: #616 · Author: Claude (for the owner) · Status: in progress · Created: 2026-10-07

## Problem

The owner approved the redesigned dashboard ("chốt") on web (#608, #611, #613; #612 open) and asked for it on
mobile ("update ở mobile luôn", then "run mobile để tôi có thể xem được UI tổng quan mới"). The iOS V2 Overview
(`newOverview`) still shows the older layout (period button, hero number, rows, top products).

## Proposed outcome

With `newOverview` on, the iOS Overview tab matches the canvas phone boards
(https://claude.ai/artifact/QsveMtPBZXksJGt9Gb8MFK, "Điện thoại · Tổng quan", "… đang mở chi tiết Thực thu"):
period chips, 4 KPI tiles with one chip each, a detail sheet per tile, the "Thực thu theo ngày" chart with
hatched forecast, and the "Hôm nay" counters with tomorrow's line. Same numbers and rules as the web page.

## Affected users and systems

MERCHANT, OUTLET_ADMIN (revenue + operations); OUTLET_STAFF (operations only, same hiding as today). iOS only.
Endpoints read: `GET /api/analytics/period`, `GET /api/analytics/outlet-operations`.

## Constraints

- No API change. #609 fields (`series[].expectedCollected`, `series[].newOrderValue`, `revenue.orderValueByType`)
  and `tomorrow` are optional: an older API renders without the forecast bar / rent-sale split / tomorrow line.
- Flag off keeps the old `OverviewViewController`.
- Days in the shop zone (`Date.shopTimeZone`), whatever the phone zone.
- Android follows in its own issue.

## Open questions

- The app forces Light (`UIUserInterfaceStyle`); the screen's colours are dynamic so it is dark-ready. A DEBUG-only
  launch argument (`-OverviewForceDark YES`) shows it dark for review.

## Decision log

- 2026-10-07 — Follow the phone board: top products and the ĐƠN rows leave the phone screen (not on the board). (Claude)
- 2026-10-07 — Thực thu forecast sums the selected period's series from today on (the tile's period), as web `forecastBar`. (Claude)
