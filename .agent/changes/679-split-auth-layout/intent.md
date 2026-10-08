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

- Google sign-in stays on /register? (kept; only /login drops it)

## Decision log (cont.)

- 2026-10-08 — Chosen design: canvas A2 "Bản chọn: A nền sáng, 4 tính năng chính" (owner)
- 2026-10-08 — No step tabs under the slides; remove Google login from /login (owner)
- 2026-10-08 — Each step shows web and iPhone captures from a seeded local shop (owner)
- 2026-10-08 — Google sign-up also hidden on /register: a Google-registered shop gets a random password, so sign-up without Google login would lock it out (owner agreed in review)
- 2026-10-08 — Review fixes: captures lazy-load and the panel only rotates from lg up (phones fetched them every 5 s), no aria-live, language switcher top-right from lg, URL bar and per-step alt text as in the canvas

## Open questions (old)

- None.

## Decision log

- 2026-10-08 — Apply to all auth pages via `ShopAuthPage` (owner)
- 2026-10-08 — Left panel: tagline + 4 features + 1 app screenshot; hidden below lg (owner)
- 2026-10-08 — Do not cram it into one screen: animate it as steps, one feature per step (owner)
- 2026-10-08 — 3:2 split; 60/40 is the common uneven split (owner); kept 50/50 at lg because 40% of 1024px is narrower than the 400px form
