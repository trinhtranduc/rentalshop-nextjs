# Plan — back to the product list keeps its filters; a new tab keeps the language

Issue: #1627 · Status: in-progress · Spec: ./spec.md

## Steps

1. Failing tests first (`bug-fix-tdd`), committed alone:
   - `tests/web-products-list-return.test.ts` — spec 1–2 (`productsListHref`, the list keys).
   - `tests/web-app-language-sync.test.ts` — spec 6 (`appLanguageSync`).
2. Bug 1:
   - `apps/client/app/products/list/list-model.ts` — `LIST_RETURN_KEY`, `productsListHref`.
   - `apps/client/app/products/list/useProductsListHref.ts` — save the query (list page) and read it back (per tab).
   - `apps/client/app/products/page.tsx` — save the query when it changes.
   - `apps/client/app/products/[id]/page.tsx` — back link and after delete.
   - `apps/client/app/products/form/ProductFormPage.tsx` — add-form back, Huỷ, not-found link, after create without id.
   - `apps/client/app/components/shell/ShopTopBar.tsx` — the "Sản phẩm" crumb.
3. Bug 2:
   - `apps/client/lib/public-content/shop-locale.ts` — `appLanguageSync`.
   - `apps/client/app/components/AppLanguageSync.tsx` — reads / writes `NEXT_LOCALE`, `router.refresh()` once.
   - `apps/client/app/components/ClientLayout.tsx` — mount it for a logged-in user on non-public, non-auth pages.
4. Verify:
   - `yarn --cwd tests test web-products-list-return web-app-language-sync` and the related web tests
     (`web-register-landing-locale`, `web-app-languages`, `web-products-*`).
   - `npx tsc --noEmit -p apps/client/tsconfig.json` (compare with `origin/dev`), `yarn --cwd apps/client lint`.
   - Headed Chrome against the local API (`anyrent_1621_e2e`, :3197), web on :3198: spec 8–10.

## Files

- listed in the steps.

## Risks

- A refresh loop if server and client disagree on the language: the sync refreshes once per mount.
- A user who saved Vietnamese and enters from the English landing now sees Vietnamese after login (the agreed rule).
- `sessionStorage` blocked: every read/write is in try/catch; the links fall back to `/products`.

## Rollback

Revert the PR. No data or API change.
