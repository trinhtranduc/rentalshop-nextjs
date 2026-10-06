# Spec — Shop time zone

## Data

1. `Merchant.timezone String @default("Asia/Ho_Chi_Minh")`, additive migration; existing rows get the default.
2. Valid value = an IANA id that `Intl.DateTimeFormat` accepts. Anything else → 400 `INVALID_TIMEZONE`
   (new error code in `errors.json`, all locales).

## API

3. `GET` login, `GET /api/users/profile`, `GET /api/merchants/{id}`, `/api/settings/merchant` return
   `merchant.timezone` (additive). Missing on old payloads = `Asia/Ho_Chi_Minh` for every client.
4. `PUT /api/settings/merchant` accepts `timezone` (MERCHANT only; ADMIN via merchant update). The change is
   written to the shop change history.
5. A request-scoped resolver `shopTimeZone(userScope)` returns the merchant's zone (cached per request);
   ADMIN/OPS without a merchant → `timeZone` param if valid, else `Asia/Ho_Chi_Minh`.
6. Every day-logic path uses the resolver instead of the constant / fixed offset / server-local midnight /
   UTC day:
   - orders list day filters, `orders/stats`
   - analytics (`period`, `overview`, `income*`, `orders`, `enhanced-dashboard`, `today-metrics`, `dashboard`,
     `outlet-operations`)
   - calendar (`by-date`, `count`)
   - availability (`products/[id]/availability`, `batch-availability`, `availability-calendar`,
     `products/availability`, `resolveAvailabilityQueryWindow` for old iOS windows)
   - schedule conflict on order create/update, rental days, late fee days
   - exports (orders, customers, products, users) — today UTC days; becomes shop days
   - cron: expiry reminders run per shop "today"; loyalty yearly reset per shop day
7. For a shop on `Asia/Ho_Chi_Minh`, every endpoint above returns byte-identical day keys/totals to today for
   the same inputs (existing tests unchanged), with or without the `timeZone` param, for old iOS windows
   (`T00:00Z…T23:59Z`) and old Android instants.
8. For a shop on another zone (tests use `America/New_York`, `Asia/Tokyo`, `Australia/Sydney`), the day
   boundary is that zone's midnight, incl. DST days (23h/25h) and a same-day rental = 1 day.

## Clients

9. Shared helpers in `packages/utils` take an optional zone (default `SHOP_TIMEZONE`): `getLocalDateKey`,
   `rental-days`, `shopDayKey`, `convertLocalDateToUTCDatetime`, availability day helpers. Fixed `+7h`
   offsets are removed in favour of IANA math.
10. Web (client, admin): a `useShopTimeZone()` hook (from the auth user, default Vietnam) replaces the
    constant in signed-in screens; day keys, "today", calendars, range picker, money-by-day use it.
    Cài đặt → Thông tin cửa hàng gets "Múi giờ" (MERCHANT edits, others read). Admin shows the zone.
11. iOS / Android: read `merchant.timezone` (fallback Vietnam), make `Date.shopTimeZone` / `shopZone`
    dynamic, send the shop zone where they send a zone today, build order instants from shop days.
12. App-config gets `shopTimeZoneAware` (or the zone) so a future build can warn staff on an old app (Q1).

## Out of scope

Currency, language, number/phone formats per region; per-outlet zones; moving existing orders' instants.
