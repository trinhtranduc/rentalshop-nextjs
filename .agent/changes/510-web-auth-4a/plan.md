# Plan — #510 Shop web login and sign-up in the 4A dotted style

Issue: #510 · Status: accepted · Spec: ./spec.md

## Steps

1. Add `packages/ui/src/components/forms/auth-shop.tsx`, with:
   - `ShopAuthPage`: the dotted background, logo, footer links and language switcher;
   - `shopInputClass` and `shopButtonClass`.
2. `LoginForm.tsx`: add the `appearance` prop. Pull the existing form body into `formBody`, which keeps its fields and handlers. In shop mode, render `ShopAuthPage` around the shop-styled fields and links. The classic branch keeps the current JSX.
3. `RegisterForm.tsx`: add the `appearance` prop. In shop mode:
   - replace the Card header with the step label and title;
   - drop the card chrome;
   - restyle the inputs through the same class helpers.
4. In `apps/client/app/register/page.tsx`, `step-1` and `step-2`, render `<RegisterForm appearance="shop">` inside `ShopAuthPage`. In `apps/client/app/login/page.tsx`, pass `appearance="shop"`.
5. Add the new keys to `locales/{en,vi,ja,ko,zh}/auth.json` (`i18n-keys`).
6. Verify (`verify-change`):
   - lint, the client type-check and the client build;
   - the admin type-check and build for the shared forms;
   - Playwright screenshots of the client `/login` and `/register` at 1440px and 390px, and of the admin `/login` before and after.

## Files

- `packages/ui/src/components/forms/{LoginForm,RegisterForm,auth-shop}.tsx`
- `apps/client/app/login/page.tsx`, `apps/client/app/register/{page,step-1/page,step-2/page}.tsx`
- `locales/*/auth.json`

## Risks

- Admin regressions from the shared forms. The default stays `classic`, and the admin screenshot is compared.

## Rollback

Revert the PR.
