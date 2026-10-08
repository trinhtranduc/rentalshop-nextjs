# Split web auth pages — intro left, form right

Issue: #679 · Author: Trinh Tran · Status: accepted · Created: 2026-10-08

## Problem

Shop web auth pages are one centered column. On desktop most of the screen is empty and a first-time
visitor learns nothing about AnyRent before signing in or creating a shop.

## Proposed outcome

At `lg` (≥1024px) every page built on `ShopAuthPage` shows a brand intro panel on the left and the
existing form on the right. Below `lg` the panel is hidden and the page is unchanged.

## Affected users and systems

Visitors and shop owners on `apps/client` web: /login, /register (+ steps), /forget-password,
/reset-password, /verify-email, /email-verification. `packages/ui`. No API, no mobile, admin unchanged.

## Constraints

- Form logic, validation, Google login, and links are untouched.
- No horizontal scroll at 375px. Light only, like today.
- Strings in en, vi, ja, ko, zh.

## Open questions

- None.

## Decision log

- 2026-10-08 — Apply to all auth pages via `ShopAuthPage` (owner)
- 2026-10-08 — Left panel: tagline + 4 features + 1 app screenshot; hidden below lg (owner)
- 2026-10-08 — Do not cram it into one screen: animate it as steps, one feature per step (owner)
- 2026-10-08 — 3:2 split; 60/40 is the common uneven split (owner); kept 50/50 at lg because 40% of 1024px is narrower than the 400px form
