# Intent — Shop time zone (multi-region)

Issue: #567 · Author: Trinh (via Claude) · Status: draft · Created: 2026-10-06

## Problem

The whole system assumes one business time zone, `Asia/Ho_Chi_Minh`: "today", calendar days, availability and
overlap, rental days, late fees, revenue by day, exports and reminders. It is hard-coded in about 120 files
(`SHOP_TIMEZONE`, fixed `+7h` offsets, `Date.shopTimeZone` on iOS, `ZoneId.of("Asia/Ho_Chi_Minh")` on Android).
A shop outside Vietnam would see wrong days everywhere. Some routes are already inconsistent today: exports
use UTC days, three analytics routes use server-local midnight, iOS sends the device zone to calendar and
analytics while availability sends Vietnam.

## Proposed outcome

- Each shop (Merchant) has a time zone, an IANA id (`Merchant.timezone`). Every existing shop and every new
  shop starts on `Asia/Ho_Chi_Minh`. The owner can change it in Cài đặt → Thông tin cửa hàng.
- The database keeps storing instants in UTC. Every "day" the system reasons about is a civil day in the
  shop's zone: today, calendar, availability, overlap, rental days, late fees, revenue and orders by day,
  exports, reminders.
- Clients send day keys (`YYYY-MM-DD`) and instants as they do today. The API reads day keys in the shop zone
  and converts instants to shop days. New clients learn the zone from the login/profile payload and send
  `timeZone=<shop zone>` where they already send a zone.
- A shop still on `Asia/Ho_Chi_Minh` gets exactly the same answers as today from every endpoint, with old and
  new apps (proved by the existing Vietnam tests staying green, plus new cases for other zones).

## Affected users and systems

`MERCHANT` (sets the zone), every shop role (sees days in it), `ADMIN`/`OPS` (see each shop's zone).
Apps: api, client, admin, iOS, Android. Model: `Merchant` (new column). Cron: subscription expiry reminders,
loyalty yearly reset.

## Constraints

- Installed iOS/Android apps cannot be force-updated (`api-compat-review`): additive only. No field removed,
  renamed or retyped. A request without a zone behaves as today for a Vietnam shop.
- Migration is additive with a default (`db-migration`); never edit an applied migration.
- Store UTC. Day logic only through the zone-aware helpers in `packages/utils` (`timezone-dates`).
- Phased: each phase is its own issue/PR and ships safely alone.

## Open questions

- Q1. A shop that changes its zone while staff still run an old app: old apps keep showing Vietnam days for
  display (server answers are correct). Allow the change with a warning, or block it until the apps that
  know `timezone` are the minimum version? (Proposed: allow, with a warning in Cài đặt, and an app-config
  flag so the apps can ask staff to update.)
- Q2. Orders that already exist when a shop changes zone keep their UTC instants; their day labels move with
  the new zone. Acceptable? (Proposed: yes, and record the change in the shop's change history.)
- Q3. Zone list in the picker: a short list (Việt Nam, Thái Lan, Singapore, Malaysia, Indonesia (3), Philippines,
  Japan, Korea, Australia (3), US (4), UK, EU) or every IANA zone with search? (Proposed: short list + search all.)

## Decision log

- 2026-10-06 — The zone belongs to the shop, not the outlet or the device (Trinh)
- 2026-10-06 — Region = time zone only; currency and language stay separate settings (Trinh)
- 2026-10-06 — The owner sets it in Cài đặt; default `Asia/Ho_Chi_Minh` for old and new shops (Trinh)
- 2026-10-06 — A client-sent `timeZone` is ignored for a user who belongs to a shop: the shop zone wins, so an
  old app with a hard-coded or device zone cannot split a shop's days. ADMIN/OPS calls without a shop keep
  using the param (default Vietnam) (Claude, to confirm in review)
