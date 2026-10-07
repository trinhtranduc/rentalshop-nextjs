# Timezone batch E — billing days, month add, emails, loyalty reset

Issue: #588 (sub-issue of #578) · Author: Trinh (via Claude) · Status: draft · Created: 2026-10-07

## Problem

Audit #578 findings API-17, PKG-6, PKG-7 / API-11 (spec §E):

- Subscription "days remaining" is `ceil(hours / 24)`: it changes during the day and does not match the end day
  the shop sees. Plan-change proration and extension pricing use the same count.
- Month addition uses `Date#setMonth(+n)` in the server zone: 31 Jan + 1 month = 3 Mar, 31 Mar + 1 month = 1 May.
  `addMonthsPreserveDay` (extension pricing) tries to clamp but lands on 31 Mar for 31 Jan + 1 month.
- Subscription emails print dates in the server zone (UTC on Railway): an end at 00:00–06:59 VN prints the day before.
- Loyalty yearly reset checks the server-local day: the cron at 00:05 VN on 1 Jan (17:05Z on 31 Dec) skips the reset.
- The expiry-reminder activity text prints the UTC day of the period end.

## Proposed outcome

- daysRemaining = civil days between VN today and the VN end day (E1).
- One shared month-add helper in `packages/utils` that keeps the VN clock time and clamps to the last day of the
  target month (E2). **Owner has not confirmed the clamp rule — first question in the PR.**
- Emails and audit text print the VN date (E3). Yearly reset fires on the VN reset day (E4).

## Affected users and systems

MERCHANT (subscription screen, emails), ADMIN/OPS (extend, renew, manual payment). api, packages/utils,
packages/loyalty, packages/database. Models read/written as today: Subscription, Payment, SubscriptionActivity,
CustomerLoyalty (cron).

## Constraints

No schema change, no migration, no data rewrite. Response shapes unchanged (`daysRemaining` stays a number or
null). Cron only against a local DB; no real emails in tests. Admin extend dialog UI is batch C.

## Open questions

- Owner: is "31 Jan + 1 month = 28/29 Feb; 31 Mar + 1 month = 30 Apr" the billing rule?
- Owner: on the last day (end day = today VN) daysRemaining becomes 0 (was 1 when the end is later that day).

## Decision log

- 2026-10-07 — Owner: proceed with batches in parallel; implement the clamp and ask in the PR (Trinh)
