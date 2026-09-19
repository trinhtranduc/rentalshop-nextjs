---
name: timezone-dates
description: Use whenever code touches dates, "today", day boundaries, calendars, availability, pickup/return windows, revenue-by-day, reminders or any YYYY-MM-DD key, in the API, web apps or mobile. Encodes the AnyRent rule "store UTC, think in Vietnam civil days" and the helpers that implement it. Most hotfixes in this repo were timezone bugs.
---

# Dates and timezones: store UTC, reason in Vietnam civil days

The DB stores instants in UTC. The business (shops, customers, reports) lives in `Asia/Ho_Chi_Minh`
(UTC+7, no DST). Railway/Vercel servers and CI run in UTC, so `new Date().toISOString().slice(0,10)`,
`getDate()`, `setHours(0,0,0,0)` and Prisma `@db.Date` comparisons all silently produce the UTC day, which
is the previous day for anything between 00:00 and 07:00 VN. This class of bug has shipped at least
five times (see `git log --grep=civil --grep=same-day --grep=timezone`).

## Rules

1. **A "day" is a VN civil day key `YYYY-MM-DD`.** Never a `Date` at local midnight. Pass day keys over the
   API (`date`, `from`, `to`, validated with `/^\d{4}-\d{2}-\d{2}$/`), not ISO instants, when the user picked a day.
2. **Convert day keys to UTC bounds with the shared helpers**, never by hand:
   - `getUtcRangeForDateKeys({ from, to })` from `@rentalshop/utils` → `{ start, end }` UTC instants
     (`2026-09-17` → `2026-09-16T17:00:00.000Z` … `2026-09-17T16:59:59.999Z`).
   - `getLocalDateKey(instant)` → VN day key of a stored UTC instant. `getUTCDateKey` is **not** the same and
     is almost never what you want.
   - `formatDateKeyInTimeZone`, `getCalendarDayRangeInTimeZone`, `resolveCalendarDateRange`,
     `parseDateRangeFromQuery` in `packages/utils/src/core/date-range.ts`. `SHOP_TIMEZONE` is the default.
   - API-only occupancy math: `apps/api/lib/availability-calendar-days.ts`
     (`toAvailabilityCivilDateKey`, `occupiedDateKeysForRange`). Keep it import-light so its unit tests stay fast.
3. **Filter in SQL with the UTC bounds** (`gte: start, lte: end`). Never fetch rows and re-check their local
   date in JS; totals and pagination go wrong on long ranges.
4. **Inclusive occupancy.** A rental occupies every civil day from pickup day to return day inclusive. A
   same-day pickup and return still occupies that one day. "Available today" must use the same day model as
   the Order Check calendar (`occupiedDateKeysForRange`), or the two screens disagree.
5. **"Today" and "now"** on the server come from `formatDateKeyInTimeZone(new Date(), SHOP_TIMEZONE)`, never
   from `new Date()` fields. Cron/reminder schedules use `REMINDER_TIMEZONE` (`Asia/Ho_Chi_Minh`).
6. **Status filters choose the date column:** `RESERVED`/`PICKUPED` use `pickupPlanAt`; other statuses use
   `createdAt`; revenue uses the payment/completion instant and **excludes `CANCELLED`**.
7. **Frontend (React):** the browser may not be in VN. Build day keys from the picker value (string), not from
   `Date#toISOString()`. Format stored instants with the formatters in `@rentalshop/utils` (`getLocalDateKey`,
   `formatDate*`), not with `toLocaleDateString()` and not by splitting an ISO string.
8. **Mobile:** iOS uses `shopTimeZone` / `availabilityTimeZone` (`Asia/Ho_Chi_Minh`) for day math and sends
   `timeZone` on order create; keep `TimeZone.current` only for display. Android must use
   `ZoneId.of("Asia/Ho_Chi_Minh")` for day keys and availability; `ZoneId.systemDefault()` is display-only.
9. **Tests are mandatory** for any date logic: include cases at `16:59:59Z` and `17:00:00Z` (the VN midnight
   boundary), a same-day rental, a range spanning a month end, and a year-long range. Run with
   `TZ=UTC yarn test <file>` **and** `TZ=Asia/Ho_Chi_Minh yarn test <file>`; results must be identical.
10. **Review checklist** before "done": grep the diff for `toISOString().split`, `setHours(`, `getDate()`,
    `getDay()`, `new Date(y, m, d)`, `@db.Date`. Each hit needs a justification or a helper.

Reference implementation: `apps/api/app/api/calendar/orders/by-date/route.ts`.
