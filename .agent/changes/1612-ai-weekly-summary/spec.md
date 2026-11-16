# Spec — AI weekly summary

Issue: #1612 · Status: accepted · Intent: ./intent.md

## API `GET /api/analytics/weekly-summary` and `POST /api/analytics/weekly-summary`

1. Permission `analytics.view.revenue`; role MERCHANT → scope `m:<merchantId>`, OUTLET_ADMIN → `o:<outletId>`.
   Any other role → 403 `FORBIDDEN`.
2. Optional `timeZone` (IANA, like the analytics routes); default Asia/Ho_Chi_Minh; invalid → 400 `INVALID_QUERY`.
3. The week is the last full Monday..Sunday before the week of today (civil days of the zone).
4. GET never calls AI. Data: `{ available, week: {start, end}, nextWeekStart, status: NONE|READY|NO_ORDERS, summary }`.
   `summary` is null when status is NONE.
5. POST returns the stored row when it exists (no AI call). Otherwise: `available` false → 503
   `AI_SUMMARY_UNAVAILABLE`; no activity in the week → store NO_ORDERS without AI; else call Claude Haiku 5.5, store
   READY with `numbers` and `content`. AI failure (error, refusal, bad JSON) → 502 `AI_SUMMARY_FAILED`, nothing stored.
   A unique-key race returns the row that won.
6. `numbers`: revenue (orderValue and collected with previous week and growth, outstanding, fees), branches (MERCHANT
   with ≥ 2 open outlets: orderValue with growth, newOrders, collected), orders (new with growth, rent, sale,
   cancelled, per day), rentals (picked up, returned, late with previous week, not picked up), products (top 3 by
   revenue, count not rented), customers (with orders, new, returning, returning share of order value).
   Same rules as Overview: cancelled orders excluded, civil days.
7. `content`: `summary`, `actions` (≤ 3), `revenueNote`, `ordersNote`, `productsNote`, in the language of
   Accept-Language (12 app languages; default Vietnamese).
8. The prompt carries no customer names or phones.

## Clients

9. iOS and Android: floating "✦ Tóm tắt tuần" on Tổng quan for MERCHANT and OUTLET_ADMIN when GET says
   `available`; red dot when status is NONE. Tap → sheet: loading, READY layout (mockup), NO_ORDERS, error with retry.
10. Web: button at the top of Tổng quan (same roles and dot) → right side panel with the same content.
11. Strings in the 12 languages of each app.

## Out of scope

Scheduled generation, history of past weeks, admin views, plan gating.
