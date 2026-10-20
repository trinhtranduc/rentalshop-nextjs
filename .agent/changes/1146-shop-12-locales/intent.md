# Public shop page in all 12 public languages

Issue: #1146 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-20

## Problem

The public shop page `/{tenantKey}/products` (booking sheet, image search) and the tracking page
`/{tenantKey}/booking/{code}` exist only in the 5 app locales, and their picker shows VI / EN only.
The landing has 12 public locales (#1000, #1118). A Russian, Thai, French or German visitor opening a shop link cannot read it.

## Proposed outcome

- A language picker on the shop pages lists the 12 `PUBLIC_LOCALES`; every string on those pages is translated.
- Dates and numbers follow the language; money stays in the shop's currency (`merchant.currency`, VND default).
- Default language as today (cookie, else Vietnamese). Vietnamese output unchanged.
- The logged-in app keeps its 5 locales; a `NEXT_LOCALE` outside them (e.g. `ru`) falls back to `en` (`zh-TW` → `zh`).

## Affected users and systems

Shop customers (no login), merchants previewing their shop. `apps/client` only. No API, iOS or Android change.

## Constraints

- No API change: the shop shows errors from response codes mapped to client keys, never the server `message`.
- Shop picker writes `NEXT_PUBLIC_LOCALE` (like the landing), never `NEXT_LOCALE`.
- Do not touch the marketing pages (pricing / features / download) another agent is localizing.

## Open questions

- Guess from the browser language for a first visit with no cookie? This change keeps today's behavior (Vietnamese).

## Decision log

- 2026-10-20 — Reuse `NEXT_PUBLIC_LOCALE` and the `LanguageSwitcher` public mode; no new cookie (agent, owner taste: simple).
