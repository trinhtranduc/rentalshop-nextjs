# Web app in the 12 languages that are on

Issue: #1597 · Author: agent · Status: accepted · Created: 2026-11-16

## Problem

After login, Settings → Language lists only Tiếng Việt and English (owner screenshot, 2026-11-16).
#1579 / #1580 turned on `webEnabled` for 12 languages, but only the public language switch reads it:

- `apps/client/app/settings/sections.tsx` `LANGUAGES` is `vi`, `en`.
- `appLocaleFor` (`apps/client/lib/public-content/shop-locale.ts`) keeps 5 languages; fr, de, ru, th, id, es → en; zh-TW → zh.
- `apps/client/i18n.ts` and `apps/client/app/layout.tsx` build the messages by hand: 5 languages, and ja / ko / zh still
  use English for dashboard, orders, customers, validation, errors and more, although `locales/ja/*.json` is complete.
- `LanguageSwitcher` sends zh / ko / ja back to English on non-landing pages (`/privacy`, `/terms`).
- The date range picker shows Vietnamese month names for a language outside the 5.

## Proposed outcome

- Settings → Language lists every `webLanguages()` language by its own name.
- The logged-in pages read `locales/<code>/<namespace>.json` for the picked language, over English (a missing key
  shows English).
- `/privacy` and `/terms` keep the picked language.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, `OUTLET_INVENTORY` on the web `client`. No API, iOS, Android, admin change.

## Constraints

- Sign-up stays as #1551: a non-Vietnamese landing opens sign-up in English; shop language stays vi / en / ja.
- Public pages (landing, shop, posts) keep their message building.
- Messages load on the server only (root layout, `i18n.ts`); the browser gets one language, as now.

## Open questions

- None. The owner expected 12 languages on the web (#1553 plan, phase 2 step 2: turn L on for the web, drop the #1551
  English fallback for L).

## Decision log

- 2026-11-16 Owner: "sao vẫn chỉ tiếng anh và việt" with the Settings screenshot. Fix the wiring; translations exist.
