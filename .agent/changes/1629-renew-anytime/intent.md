# Gia hạn gói lúc nào cũng được

Issue: #1629 · Author: agent for Trinh Tran · Status: accepted · Created: 2026-11-19

## Problem

The apps offer the same plan only with ≤ 7 Vietnam days left (`RENEW_WINDOW_DAYS`, #1459). A shop paid by transfer
with 73 days left cannot pay ahead for Basic; Professional with more than 7 days left can buy nothing.

## Proposed outcome

Owner, 2026-11-19: "không cần đợi 7 ngày, có thể gia hạn, nâng cấp, huỷ". A shop that does not auto-renew may renew the
same plan or buy a higher one at any time; the days left carry (A13, already live). Auto-renewing shops keep today's
offer (only the upgrade on their own store; Apple does not sell a running subscription again). Cancel = keep using to the
end, no more renewals (already live). Mockup: https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4 tab "★ Gia hạn gói",
"Cập nhật 19/11".

## Affected users and systems

- `MERCHANT` (buys in the app). API `GET /api/subscriptions/status` only; installed iOS 1.2.8 / Android 0.1.14 follow it.

## Constraints

- No new or renamed field; `renewWindowDays` stays 7 (the apps' Home reminder).
- App copy (Huỷ gói row, "Gia hạn" instead of "Bật lại tự gia hạn", one footer line) is a later app PR.

## Decision log

- 2026-11-19 — Owner: drop the 7-day wait; renew, upgrade, cancel any time. Cases in the mockup (Shop Hoa, Shop Lan);
  owner asked "test giúp tôi" after reading them (agent takes it as the go; merge stays with the owner).
- 2026-11-19 — CANCELLED / cancelled-at-period-end rows that no store bills now get the same plan at once (was: in the
  last 7 days); a store row on this device's store keeps A6 "Bật lại tự gia hạn" (agent).
