# Public pages keep their production copy in 7 languages

Issue: #1589 · Author: agent · Status: in-progress · Created: 2026-11-15

## Problem

Release review `dev → main-real`: 4 test suites pass on `main-real` and fail on `dev`. #1580 copied
`locales-pending/<lang>` over `locales/<lang>` for fr, de, th, id, es, ru, zh-TW, so the public pages (landing,
features, download, pricing) lost the copy customers see today: "Web Portal" in English, "99.000 VND" on the pricing
page (owner, #1120: no amount outside Vietnamese). The fee test still assumed ja, ko, zh had no text of their own.

## Proposed outcome

`landing`, `features`, `publicPages`, `public` and the public part of `plans` of those 7 languages equal production,
plus the 14-day trial (#1576). The four suites pass, so the release has no new failing suite.

## Affected users and systems

Visitors of the public pages in 7 languages (`apps/client`). No API, iOS or Android change.

## Constraints

- English public files are unchanged since production except the trial period, so production copy is complete.
- `products.json` and `common.json` stay as on `dev` (shared with the management pages, reviewed twice).

## Decision log

- 2026-11-15: owner: release with the web languages tonight; restore production copy rather than retranslate.
