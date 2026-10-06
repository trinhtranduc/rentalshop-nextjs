# Spec — Timezone audit fixes

Day = Vietnam civil day key (`YYYY-MM-DD`); bounds = `[D 00:00 VN, next day 00:00 VN)` = `[D-1 17:00Z, D 17:00Z)`.
Every behaviour below gets a test at 16:59:59Z / 17:00:00Z, run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.

## A. Availability (API-1, API-2)
A1. `GET /api/products/availability?date=D` counts an order on D iff its VN pickup day ≤ D ≤ its VN return day.
A2. `products/batch-availability`: an order picked up exactly at the next VN midnight is not on D; one returning
    at D's VN 00:00 is on D (pickup `< end`, return `>= start`).
A3. Old inputs (old iOS UTC windows, `timeZone=UTC`, plain keys) give the same answer as A1/A2. Response shape unchanged.

## B. Day-based reports (API, packages/utils)
B1. `parseDateRangeFromQuery`, `normalizeStart/EndDate`, `getDateRangeFromPeriod`, `validateDateRange` use VN days.
B2. Exports (orders, customers, products, users, merchants): rows = the list for the same filter; Excel cells
    show VN date-time (`formatDateForExcel`).
B3. `analytics/today-metrics`, `dashboard`, `growth-metrics`, `top-products`, `top-outlets`, `top-customers`,
    `overview` (stats block also excludes CANCELLED), `system`, `recent-orders`, `enhanced-dashboard` (upper bound),
    `customers/[id]/orders`, `merchants/[id]/orders`, `orders/cursor`, `orders/statistics` (list and aggregate agree),
    `calendar/orders` meta range, `calendar/orders/count` default year: all on VN days.
B4. One overdue rule everywhere: status PICKUPED and `returnPlanAt` before the start of VN today.

## C. Admin (ADM-*, PKG-3/4/5/8)
C1. Presets and custom ranges send VN keys whatever the browser zone.
C2. Subscription form and extend dialog keep the same instant on save without edits; extension end = VN end of day.
C3. Admin create/edit order picker returns the tapped day's key in any browser zone.
C4. Business dates display in the VN zone.

## D. Shop web (WEB-2/3/4)
D1. "Today" refreshes on focus/visibility and at VN midnight.
D2. Sửa đơn keeps pickupPlanAt/returnPlanAt when the day key is unchanged.
D3. "Hết hạn N ngày trước" counts civil days.

## E. Billing / mail / cron (API-17, PKG-6, PKG-7)
E1. daysRemaining = civil days between VN today and the VN end day. E2. Month add clamps (31 Jan + 1 month = 28/29 Feb).
E3. Emails print VN dates. E4. Loyalty yearly reset fires on the VN reset day.

## F. Mobile (IOS-*, AND-*)
F1. Order create/edit/extend instants = VN day bounds whatever the phone zone.
F2. Date filters, today, late days, grouping, rental-day count and labels use the VN zone.
F3. Calendar/overview/today-work send `timeZone=Asia/Ho_Chi_Minh`.
F4. A phone set to Vietnam produces byte-identical requests to today's build.

## Out of scope
Per-shop zone (#567), changing stored orders, UI redesign.
