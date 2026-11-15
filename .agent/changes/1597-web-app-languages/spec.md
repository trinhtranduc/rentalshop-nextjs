# Spec — Web app in the 12 languages that are on

Issue: #1597 · Status: accepted · Intent: ./intent.md

## Behavior

1. `APP_LOCALES` equals the codes of `webLanguages()`; `appLocaleFor(code)` returns `code` for each of them.
   Another public language → `en`; anything else → `vi`.
2. `appMessages(code)` (`apps/client/lib/app-messages.ts`) returns, for every web language and every namespace the
   app reads, the strings of `locales/<code>/<namespace>.json` over the English file.
3. `apps/client/i18n.ts` and the root layout's logged-in path take their messages from `appMessages`.
4. Settings → Language (`apps/client/app/settings/sections.tsx`) lists `webLanguages()` with their own names.
5. `LanguageSwitcher` no longer forces zh / ko / ja to English on non-landing pages.
6. The date range picker formats month names in the picked language (Thai with Gregorian years).
7. Unchanged: `registerLocaleFromLanding` (#1551), `signupShopPrefs`, public page messages.

## Out of scope

Admin languages. Native-speaker review. Number formats that already fall back to en-US.

## API and data

None.
