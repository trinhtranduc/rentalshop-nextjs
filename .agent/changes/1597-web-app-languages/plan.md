# Plan — Web app in the 12 languages that are on

Issue: #1597 · Status: in-progress · Spec: ./spec.md

## Steps

1. `tests/web-app-languages.test.ts` (fails on dev). Update `tests/shop-12-locales.test.ts`, which pins the 5 app
   languages. Commit the tests alone.
2. `apps/client/lib/public-content/shop-locale.ts`: `APP_LOCALES` from `webLanguages()`.
3. `apps/client/lib/app-messages.ts`: load each namespace of a language over English, cached per language.
4. `apps/client/i18n.ts`: drop the hand-built map; use `appMessages`. `apps/client/app/layout.tsx`: logged-in path
   uses `appMessages`.
5. `apps/client/app/settings/sections.tsx`: `LANGUAGES` from `webLanguages()`, two columns from `sm`.
6. `packages/ui/.../LanguageSwitcher.tsx`: drop the zh / ko / ja fallback and redirect.
   `packages/ui/.../date-range-picker.tsx`: fall back to the locale itself.

Skill: `i18n-keys`. No API change, so no `api-compat-review` row.

## Verify

- `yarn --cwd tests test web-app-languages shop-12-locales web-register-landing-locale locales-complete public-language-switcher-reloads web-signup-prefs`
- `npx tsc --noEmit -p apps/client/tsconfig.json` (compare error count with dev), lint on changed files
- Client production build, then a headed browser: log in, Settings → 日本語 and Français, the main pages change language.

## Rollback

Revert the PR; the app returns to VI / EN.
