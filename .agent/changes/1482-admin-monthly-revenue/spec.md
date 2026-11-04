# Spec — Admin monthly revenue

Issue: #1482 · Status: accepted · Intent: ./intent.md

## Behavior

Counting rules (API `GET /api/admin/revenue/monthly`):

1. A payment counts as **received** when `type = SUBSCRIPTION_PAYMENT` and `status` is `COMPLETED` or `REFUNDED`
   (a refunded payment was received once and stays in its original month). `PENDING`, `FAILED`, `CANCELLED` never count.
2. Its date is `processedAt`; when `processedAt` is null it falls back to `createdAt`. The month and the day are the
   Vietnam civil day of that instant (`getLocalDateKey`; range by `getUtcRangeForDateKeys`). A payment at 00:30 Vietnam
   time on 03/11 (17:30Z on 02/11) belongs to 03/11.
3. **Total (VND)** adds only `currency = VND` payments. Any other currency is not added: it is returned as its own
   line `{ currency, total, count, refundTotal, refundCount }`. No conversion.
4. **Refunds** are `status = REFUNDED` payments dated by `refundedAt` (Vietnam day); when `refundedAt` is null (a refund
   made before this change) it falls back to `updatedAt`. They are returned as `refunds { total, count }` (VND) and are
   never subtracted from `received.total`. A refund of an October payment made in November is in November's `refunds`
   and still in October's `received`.
5. **Channel** from `Payment.method`: `IAP_APPLE` = `APP_STORE`, `IAP_GOOGLE` = `GOOGLE_PLAY`, `TRANSFER` / `MANUAL` /
   `CASH` = `TRANSFER`, `LEMON_SQUEEZY` / `STRIPE` = `CARD`, anything else (`PAYPAL`, `CHECK`) = `OTHER`.
   `byChannel` lists the four main channels always (zero filled) and `OTHER` only when non-zero; it sums to `received.total`.
6. **New vs renewal**: a received VND payment is "new" when it is the first received payment of its shop (by date, then
   id; any currency counts as earlier); every later one is "renewal". A payment without a shop is a renewal.
   Query: the payments of the range, plus one `findMany` of `distinct merchantId` of earlier payments for the shops in the range.
7. `?month=YYYY-MM` returns that month: `daily` (every Vietnam day of the month, zero filled), previous-month
   `previous.daily`, the by-channel table, `latest` (10 newest payments of the month) and the 12 months of that year in
   `months`. `?year=YYYY` returns the whole year: `daily` is empty, `latest` is the 10 newest of the year, `months` as above.
   Anything else (both, none, `2026-13`, `20-26`) is `400 INVALID_QUERY`. A future month returns zeros.
8. `todayKey` (Vietnam civil day on the server) is returned so the UI marks future days and picks the comparison range
   without the browser clock.
9. Only `ADMIN` and `OPS` (`PLATFORM_OPS_ROLES`). A merchant or outlet role gets `403`.

Writers:

10. `Payment.refundedAt` (nullable) is set to the refund event time when the RevenueCat webhook marks a payment
    `REFUNDED`. A repeated webhook keeps the first date.
11. `POST /api/payments/manual` stores `processedAt` (now), `merchantId`, `subscriptionId` (the merchant's
    subscription) and `currency` of the request; the request shape is unchanged.
12. `subscriptions/[id]/renew` writes a `COMPLETED` row (Stripe) with `processedAt` already; its other rows are
    `PENDING` and do not count until completed. No change.
13. Sandbox RevenueCat purchases create no payment row (unchanged).

Admin UI (Dashboard):

14. The block title "Doanh thu gói dịch vụ"; month picker `‹ Tháng 11/2026 ›` (current month by default, `›` disabled on
    the current month, `‹` disabled before 2020-01) and a "Cả năm" toggle. The month lives in the URL
    (`?month=2026-11`; the "Cả năm" toggle is a bare year, `?month=2026`), next to `?period=`. A missing or invalid
    value means the current month.
15. Big number = VND received. Under it: comparison. Current month: the same days (1..today) of the previous month.
    Completed month: the whole previous month. January compares with December of the previous year. Year view: no
    comparison, the text "Cả năm 2026, tính tới hết tháng 11". Previous total 0: "— so với ... (chưa có thanh toán)".
16. Refund note: "Hoàn tiền trong tháng: N khoản, X ₫ (không trừ vào tổng)". Other currencies: "USD 11,00 (chưa quy đổi)".
17. Daily bars (monthly bars in the year view), future days drawn as a flat line, tooltip, by-channel table, 12-month table
    (Tháng, Doanh thu, Thanh toán, Đăng ký mới, Gia hạn; click a month to select it; future months disabled) with
    CSV export (also refund columns), the latest 10 payments (Ngày, Shop, Gói, Kênh, Số tiền, Trạng thái) with a
    link to the existing Payments page, loading skeleton, empty state, error state.
18. VND shows without a "$" prefix. Strings come from `locales/*/dashboard.json` (`revenue.*`) in vi, en, ja, ko, zh.
19. The old "Subscription Revenue" chart is gone with `calculateSubscriptionRevenueData`, the `$` chart component,
    `inDashboardWindow`, the unused `subscriptions` fetch and the `subscriptionStats.totalRevenue` field. Tiles,
    rankings, new-merchant chart and the today / month / year switch work as before.

## Out of scope

- Converting USD to VND. Dating old refunds (they use `updatedAt`). A backfill of old `processedAt` / `merchantId`.
- Counting `PLAN_EXTENSION` / `PLAN_CHANGE`. Changing the existing `GET /api/payments` list. iOS and Android.
- Fixing `payments/manual` accepting `BANK_TRANSFER` / `CREDIT_CARD`, which the `PaymentMethod` enum does not have (noted for the owner).

## API and data

New column `Payment.refundedAt DateTime?` and index `(status, refundedAt)`; migration `20261104100000_payment_refunded_at`
(`ADD COLUMN`, `CREATE INDEX`, nothing else). Response (all keys new):

```
{ success, code: 'ADMIN_REVENUE_SUCCESS', data: {
  scope: 'month' | 'year', month: 'YYYY-MM' | null, year: number, todayKey: 'YYYY-MM-DD',
  received: { total, count, newCount, renewalCount },     // VND
  refunds: { total, count },                              // VND, by refundedAt
  otherCurrencies: [{ currency, total, count, refundTotal, refundCount }],
  daily: [{ date, total, count }],                        // month scope only
  previous: { month: 'YYYY-MM', daily: [{ date, total, count }] } | null,   // month scope only
  byChannel: [{ channel, total, count }],
  months: [{ month, total, count, newCount, renewalCount, refundTotal, refundCount }],   // 12 entries
  latest: [{ id, at, dateKey, merchant: { id, name } | null, planName | null, channel, amount, currency, status }]
} }
```

Auth: `withAuthRoles([...PLATFORM_OPS_ROLES])`. No merchant scope (platform data). `merchant.id` is the numeric `publicId`.

## Acceptance

- [ ] Each behavior line has a test (`tests/api/admin-revenue-*.test.ts`, `tests/packages/admin/dashboard-revenue-model.test.ts`)
- [ ] Jest green in `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [ ] iOS and Android: not called, shown by `git grep origin/main-real` (compat table)
- [ ] New strings in vi, en, ja, ko, zh
- [ ] Cancelled / failed payments do not count; Vietnam civil days; roles hold
- [ ] Screenshots: month with data, "Cả năm", empty month
