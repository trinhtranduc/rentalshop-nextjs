# Attendance module (1/4): data, API and per-shop module switch

Issue: #907 (part of #906) · Author: Trinh Tran (agent draft) · Status: approved (mockup 2026-10-12) · Created: 2026-10-12

## Problem

Shops pay staff by hours or by worked days and track them on paper. #906 adds a paid "Chấm công" module:
staff scan a QR shown at the outlet counter with the AnyRent app, the server checks the QR, the GPS
distance and fake-location signs, and the shop gets a monthly timesheet. There is no feature-module
infrastructure yet, so a shop cannot be given (or sold) one feature on its own.

## Proposed outcome

- Admin turns the `attendance` module on for one merchant (optional end date) from the admin merchant page.
  While it is off or expired, every attendance route answers 403 `MODULE_NOT_ENABLED`.
- Login and `GET /api/users/profile` say which modules are on (`merchant.modules: ["attendance"]`).
- Per outlet: coordinates, radius (default 100 m, 50–500), its own QR code (daily or fixed, made on
  demand, "new code" kills the old one) and a counter (kiosk) link that shows the QR without a session.
- One punch endpoint decides IN or OUT, enforces QR / outlet / distance / accuracy / mock rules, and
  flags "suspected fake". Forgotten clock-outs close at the end of the Vietnam day as "missing out", 0 h.
- Shift templates; weekly repeating rules plus one-day changes; worked or past days locked; staff get a
  notification when their schedule changes.
- A monthly timesheet per outlet, a per-person month list of every scan (rejected ones and coordinates
  included), manual edits with a required reason and history, month lock, Excel export.

## Affected users and systems

- Roles: `ADMIN` (toggle), `OPS` (read), `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY`.
- Apps: `api`, `admin` (module toggle only). Client web screens and iOS/Android come in later parts of #906.
- Data: new tables only (`MerchantModule`, `AttendanceSetting`, `ShiftTemplate`, `ShiftRule`, `ShiftDay`,
  `AttendanceRecord`, `AttendanceScan`, `AttendanceEdit`, `AttendanceMonthLock`).

## Constraints

- Installed apps cannot be force-updated: additive only (new routes, new tables, one new field in the
  login / profile `merchant` object). Additive migration.
- Store UTC, days are Vietnam civil day keys (`timezone-dates`).
- Times are server time; the phone clock is never trusted.
- A single-session login must not be used by the counter screen (kiosk link instead).
- Keep it simple (owner): no payroll, no pricing, no new infra (no cron, no queue, no new env var).

## Open questions

- See `spec.md` → Open questions (Q-A … Q-F).

## Decision log

- 2026-10-12 — Two modules: Chấm công and Tính lương (needs Chấm công). API checks each (403 `MODULE_NOT_ENABLED`). (owner, #906)
- 2026-10-12 — Radius 100 m default (50–500), accuracy ≤ 100 m, QR expires 60 s / refresh 30 s, kiosk link, mock location blocked from v1, forgot clock-out = auto close 0 h. (owner, #906)
- 2026-10-12 — This PR: data + API + module switch + admin toggle only; mockup approval before code. (owner via coordinator)
- 2026-10-12 — Mockup approved (./mockup.html). Changes since the first draft: QR per outlet is daily
  (changes 00:00 VN) or fixed, made on demand, no 60 s rotation; QR and location live in the outlet page;
  shifts repeat weekly from rules with one-day changes; only days not yet worked can change (409
  `SHIFT_LOCKED`); templates hide, delete only if never used; no shift swaps; staff notified on schedule
  change; timesheet and report merged; per-person month table with every scan and coordinates; month lock;
  app entry is the first row of Cài đặt. (owner, #906)
