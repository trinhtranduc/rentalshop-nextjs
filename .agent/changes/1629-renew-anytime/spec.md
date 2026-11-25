# Spec — Gia hạn gói lúc nào cũng được

Issue: #1629 · Status: accepted · Intent: ./intent.md

## Behavior (`renewalOffer` in `apps/api/lib/plan-renewal.ts`)

1. Active, not trial, not auto-renewing, not A6 → the current in-app plan and higher ones, whatever the days left
   (20, 73, 200). `canRenew` true when the current plan is in-app.
2. Professional (highest) in that state → `[Professional]`, `canRenew` true, `canUpgrade` false.
3. Unchanged: expired / trial → every in-app plan; auto-renewing → higher plans on its own store only (A5), nothing
   elsewhere; A6 → `reenableAutoRenew`, higher plans only; Enterprise or a plan not sold in the apps → nothing while it
   runs; no plans → nothing.
4. `renewWindowDays` stays 7 in `GET /api/subscriptions/status` (the apps show the Home line only in those days).
5. Example (Shop Hoa): 19/11/2026 10:00 VN, Basic MANUAL to 31/01/2027 → `daysRemaining` 73, `[Basic, Professional]`;
   an App Store purchase then ends 31/01/2028 (store expiry 19/11/2027 + 73 days, `storeCreditForPurchase`).

## Out of scope

App copy changes (next app build), web purchase (not sold on the web).
