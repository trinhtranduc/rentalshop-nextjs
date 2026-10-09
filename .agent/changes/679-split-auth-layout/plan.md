# Plan — Split web auth pages

Issue: #679 · Status: accepted · Spec: ./spec.md

## Steps

1. Add `auth.showcase.{intro,calendar,orders,conflict,imageSearch}.{title,desc}` and `auth.showcase.goTo` to
   `locales/{en,vi,ja,ko,zh}/auth.json` (`i18n-keys`).
2. `packages/ui/src/components/forms/auth-shop.tsx`: wrap the page in a `lg:grid-cols-2` grid,
   add `ShopAuthShowcase` (left), hide the small brand mark on lg.
3. Verify: `npx tsc --noEmit -p apps/client/tsconfig.json`, `yarn lint`, run client and screenshot
   /login, /register at 1440 and 375 (`verify-change`).

## Files

- `apps/client/public/auth-showcase/*.jpg` — 4 web + 4 phone captures + 1 query photo (~0.9 MB total, lg only)
- `apps/client/app/login/page.tsx` — drop the Google button

- `packages/ui/src/components/forms/auth-shop.tsx` — layout + panel
- `locales/*/auth.json` — strings

## Risks

- Translations reach `ShopAuthPage` through `useAuthTranslations`; confirm `showcase` is under the `auth` namespace.

## Rollback

Revert the PR; one component and locale keys.
