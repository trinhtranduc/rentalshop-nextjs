# Thanh toán gói trên web qua Polar (thay Lemon Squeezy)

Issue: #1631 · Author: agent for Trinh Tran · Status: accepted · Created: 2026-11-21

## Problem

The web takes plan payments by card through Lemon Squeezy, which stops processing payments on 31/03/2027
(https://polar.sh/docs/migrate-lemon-squeezy). The owner picked Polar (merchant of record, Vietnam payouts, VND prices,
6-month interval). The web plan page also computes prices as monthly × months × 0.9 and sells monthly / quarterly /
yearly, which matches neither the card price list nor the apps' 6 / 12-month cycles.

## Proposed outcome

- A shop owner pays on the web through a Polar checkout; Polar renews every cycle.
- "Quản lý / huỷ gói" on the web opens Polar's customer portal (cancel, card, invoices, plan switch).
- The Polar webhook updates the plan with the same rules as the App Store / Google Play (#1459): days left carry (A13),
  cancel keeps the period, a failed charge keeps the paid days, a refund goes back to the end before the purchase, each
  event once, stale events skipped.
- The web plan page shows the Polar product prices and sells 6 / 12 months.
- Every Polar charge is a payment row (method `POLAR`, the real amount) and shows in admin revenue as a card payment.

## Affected users and systems

`MERCHANT` (buys, manages); `ADMIN` (revenue report). Apps: `api`, `client`, `admin` (one mapping). iOS / Android: no
change; installed apps read `billingChannel` as a free string (see the issue's compat table). External: Polar (sandbox on
`dev`, production on `main-real`), Railway env.

## Constraints

- Installed apps keep working: `billingChannel` only gains a value; no field removed or retyped.
- Unset Polar env = the web as before (Lemon Squeezy). Lemon webhook stays until 31/03/2027.
- Prices live in Polar (owner sets them); nothing hard-coded. Card prices = App Store prices (2026-11-21 price list).
- Inside the apps nothing mentions the web or transfer prices (Apple / Google anti-steering).
- Migration additive only (`PaymentMethod` gains `POLAR`).
- No new npm dependency: Polar REST + Standard Webhooks signature with Node `crypto` (same as `@polar-sh/sdk` 1.3.2).

## Open questions

- None blocking. Showing the transfer price on the web plan page: later.

## Decision log

- 2026-11-21 — Polar replaces Lemon Squeezy for new web card payments (owner: "tôi muốn tích hợp polar thay cho lemonsquare").
- 2026-11-21 — Price list: card 599k / 999k / 1.299k / 1.799k (Basic 6 / 12, Pro 6 / 12), transfer cheaper (owner).
- 2026-11-21 — Cases 1–6 in the issue confirmed ("đồng ý"); they mirror the store rules of #1459.
- 2026-11-21 — Per 2026-11-02: Basic pays in the app, Pro on the web; the web sells whatever plans have a Polar product.
- 2026-11-21 — A shop auto-renewing on Polar changes plan or cycle in Polar's portal (no second checkout); an ended Polar
  subscription leaves the shop manual with its paid days (agent, follows case 4).
