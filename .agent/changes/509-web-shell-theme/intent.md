# Intent — #509 New shop web shell, light/dark theme, login and sign-up

Issue: #509 · Author: Trinh (via Claude) · Status: accepted · Created: 2026-10-06

## Problem

The merchant web app (`apps/client`) looks different from the mobile apps and from the approved redesign
(https://claude.ai/artifact/LQW4YkXiGwHzwNEBZSMX3j). The sidebar, top bar, font and colours are older styles.
There is no dark theme, and the bell shows a fixed number instead of the real unread count.

## Proposed outcome

Phase 1 of the 7-phase rollout (plan: https://claude.ai/code/artifact/a221f242-a006-49f4-bdc0-aa7a2624f348).
Every signed-in page sits inside the new shell. The shell has:

- a 248px sidebar: logo, shop and outlet name, Tạo đơn, the main nav and a QUẢN LÝ group, and a user footer;
- a top bar: search, theme switch, bell with the real unread count;
- light and dark tokens; Be Vietnam Pro.

Login and sign-up use the 4A dotted-background style. Later phases redraw the pages inside the shell.

## Affected users and systems

All web roles (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`). App: `client` only. Reads `GET /api/notifications`
(already deployed). No API, schema, or mobile change. `apps/admin` must not change.

## Constraints

- Role filtering of the nav stays exactly as today.
- Existing pages keep working inside the new shell, even before they are redrawn.
- `apps/admin` shares `packages/ui` and `tailwind.config.base.js`. Do not edit components or tokens admin uses.
- Public pages (landing, blog, SEO pages) keep Inter and their current look.
- All new strings in en, vi, ja, ko, zh.

## Open questions

- None blocking. Default chosen: the theme switch is shown only when `NEXT_PUBLIC_ENABLE_THEME_SWITCH=true`,
  because pages not yet redrawn use hard-coded light colours. It is turned on everywhere once phase 7 lands.

## Decision log

- 2026-10-06 — Design boards and 7-phase plan approved ("chốt") (Trinh)
- 2026-10-06 — Theme follows the OS on first visit; the user's choice is remembered (Trinh asked for light/dark)
- 2026-10-06 — Phase 1 ships as two PRs on this issue: shell + theme first, then login and sign-up (Claude, to keep each review small)
