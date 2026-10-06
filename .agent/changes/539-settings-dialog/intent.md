# Intent — #539 Cài đặt opens as a large dialog

Issue: #539 · Author: Trinh (via Claude) · Status: accepted · Created: 2026-10-06

## Problem

Cài đặt cửa hàng is a full page (`/settings`). Opening it takes the user away from the page they were on.
The owner asked for a large dialog with the tab list on the left and the section on the right, like Claude's settings.

## Proposed outcome

- The sidebar item "Cài đặt cửa hàng" opens a large modal over the current page. Left: the tab list (same tabs
  per role as #528). Right: the section, scrolling inside the dialog. Full screen on phones.
- Close with ✕, Esc or the backdrop. The page underneath stays as it was.
- The open tab lives in the URL (`?settings=<tab>`), so refresh and shared links work.
- `/settings?tab=…` keeps working (old links, `/subscription`, Lemon Squeezy return): it opens the dialog.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on the shop web. App: `client` only. Same API calls. No API, schema,
mobile or `apps/admin` change.

## Constraints

- Same tabs, sections and save actions as #528. `packages/ui` is not edited.
- Shared dialogs opened from a section (bank account, plans, confirm) appear above the settings dialog.
- New strings in en and vi (`settings.json` exists only there, as in #528).

## Decision log

- 2026-10-06 — Dialog like Claude's settings (Trinh)
- 2026-10-06 — State in `?settings=<tab>` on the current page; `/settings` redirects to `/dashboard?settings=<tab>` (Claude)
- 2026-10-06 — Own modal inside the shell (not the shared Radix `DialogContent`): it must sit inside `.ar-theme`
  for dark tokens and below the shared dialogs (z-[100]) that sections open (Claude)
