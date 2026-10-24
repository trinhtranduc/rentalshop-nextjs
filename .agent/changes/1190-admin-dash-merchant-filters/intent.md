# Admin dashboard tiles list matching merchants

Issue: #1190 · Author: owner · Status: accepted · Created: 2026-10-24

## Problem

The admin dashboard Active tile shows **23** paid shops but a pill **Basic: 43 | Pro: 19**. Those plan counts walk every subscription, not the 23 Active ones, so they cannot be a breakdown of Active.

Clicks go to `/subscriptions` (or an unfiltered list). The owner wants every tile to open the **merchant** list for that bucket: Trial, Active, Basic, Pro, Expiring, Expired, Cancelled. The number on the tile must match the list.

GET `/api/merchants` cannot serve that list today: `status=active` means shop `isActive`, `plan=Basic` is `parseInt` (NaN), and trial/expired are filtered after pagination (totals are wrong).

## Proposed outcome

- The confusing **Active** (DB paid enum) tile is **In use** = còn hạn đang dùng (`currentPeriodEnd > now`, not cancelled/paused).
- Basic / Pro / Enterprise chips count among In use and open that merchant list.
- Trial / Expiring / Expired / Cancelled / Merchants each open `/merchants` with a matching `total`.
- GET `/api/merchants` applies those filters in the database.

## Affected users and systems

Roles: `ADMIN` / `OPS` (admin dashboard and merchants list).
Apps: `api`, `admin`, `packages/database`.
Installed POS apps do not call GET `/api/merchants`.

## Constraints

- Dual IDs. Additive query params where possible; numeric `plan=<id>` still works.
- `status=inactive` stays shop `isActive=false`.
- Same period window as #1180: expiring = `currentPeriodEnd` in (now, now+7×24h]; expired = period end already passed (not only enum `EXPIRED`).
- Do not mix #984. Target `main-real`.

## Open questions

None. Owner: click stats → list those merchants; show matching numbers.

## Decision log

- 2026-10-24 — Tiles open `/merchants`, not `/subscriptions`. (owner)
- 2026-10-24 — Owner: Active (paid enum) is confusing. Need Basic/Pro/Enterprise filters and “còn hạn đang dùng”. Tile renamed **In use**; `status=current`. `status=active` is an alias of current. (owner)
