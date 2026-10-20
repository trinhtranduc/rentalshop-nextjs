# Shop owner picks the shop currency (VND / USD)

Issue: #1145 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-20

## Problem

#1144 sets `Merchant.currency` once at sign-up from the sign-up language and removed the web auto-sync. A shop with the
wrong currency has no place to fix it. iOS and Android always show VND and ignore the shop currency.
`PUT /api/settings/currency` only needs `merchant.view`.

## Proposed outcome

- Only the owner (role `MERCHANT`) can change the currency. API: 403 `INSUFFICIENT_PERMISSIONS` for every other role.
- Web: "Tiền tệ" VND (đ) / USD ($) in Cài đặt → Thông tin cửa hàng, saved with the card's Lưu after a confirm.
- iOS / Android: every money display goes through one formatter per app that follows the shop currency;
  owner-only "Tiền tệ" row in shop settings with the same confirm.
- Amounts are never converted.

## Affected users and systems

MERCHANT (changes it), every role (sees prices in it). api, client, iOS, Android. `Merchant.currency` (existing column).

## Constraints

- Additive only; no response field added, no migration. Installed apps keep showing VND (they ignore the field).
- Missing / unknown currency on mobile → VND (today's behaviour).
- Owner: simple, few words.

## Open questions

- None.

## Decision log

- 2026-10-20 — owner: merchant can set VND / USD on web and mobile; only the merchant changes it; mobile loads it and formats prices with it.
- 2026-10-20 — mobile reads the currency from the login payload (`user.merchant.currency`) and refreshes it with the existing `GET /api/settings/currency` (readable by every role); no new API field (agent).
- 2026-10-20 — USD style on every platform = web `formatCurrency` (`$220,000.00`, en-US, 2 decimals). VND keeps each app's current style (agent).
- 2026-10-20 — out of scope: legacy v1 mobile screens behind the new-screen flags, thermal printer text, admin app (agent; noted in PRs).
