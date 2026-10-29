# Plan — Web reads the shop currency again

Issue: #1321 · Status: done · Spec: ./spec.md

## Steps

1. Failing test `tests/web-currency-refresh.test.ts` (pure function, signature, layout wiring); commit alone.
2. `settings-model.ts`: `shouldRefreshShopCurrency`, `SHOP_CURRENCY_REFRESH_MS`.
3. `apps/client/app/components/ShopCurrencySync.tsx` inside `CurrencyProvider` in `ClientLayout.tsx`.
4. `packages/hooks/src/hooks/auth-sync.ts`: currency in `userSyncSignature`.
5. Visual check with a local API and headed Chrome.

## Verify

`cd tests && yarn test web-currency-refresh web-settings auth-sync`, `npx jest locales-valid-json`, tsc client (compare with origin/dev),
eslint changed files.

## Risks

Extra `GET /api/settings/currency` at most once per minute per open tab.

## Rollback

Revert the PR.
