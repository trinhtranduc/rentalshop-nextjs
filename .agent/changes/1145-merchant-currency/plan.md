# Plan — Shop owner picks the shop currency (VND / USD)

Issue: #1145 · Status: in-progress · Spec: ./spec.md

## Steps

PR1 `feat/1145-merchant-currency-web` (api-route-standard, api-compat-review, i18n-keys):
1. Failing test `tests/api/settings-currency-owner.test.ts`, then `apps/api/app/api/settings/currency/route.ts`:
   `withPermissions(['merchant.manage'])` + role MERCHANT check → 403 `INSUFFICIENT_PERMISSIONS`.
2. `apps/client/app/settings/settings-model.ts`: `shopCurrency`, `currencyExample` (pure, tested).
3. `apps/client/app/settings/sections.tsx` `ShopInfoSection`: "Tiền tệ" control + confirm (MERCHANT only).
4. `apps/client/app/settings/SettingsPanel.tsx` `saveMerchant`: PUT currency when changed, `setCurrency`, stored user, `refreshUser`.
5. `locales/{en,vi,ja,ko,zh}/settings.json` `web.form.currency*`.
6. `.agent/api-changes/LOG.md` row.

PR2 `feat/1145-merchant-currency-ios` (mobile-parity): shop currency store + `MoneyFormatter` currency-aware; "đ" suffix
sites use it; Settings v2 row + confirm + `PUT/GET /api/settings/currency`; strings en / vi; unit tests.

PR3 `feat/1145-merchant-currency-android` (mobile-parity, copies iOS): `SessionStore` currency flow; one formatter that every
money helper delegates to; Settings v2 row + confirm; strings values / values-vi; unit tests.

## Verify

`cd tests && npx jest api/settings-currency-owner web-settings-currency`, full `yarn test`; tsc client (baseline 165) / api (133);
eslint changed files; iOS `xcodebuild … -scheme Development … build` + unit tests; Android `./gradlew :app:assembleDebug :app:testDebugUnitTest`.
Visible runs with a local API on an own Homebrew Postgres DB; screenshots in the scratchpad `merchant-currency/`.

## Risks

- Stale merchant web tabs (old JS) still auto-sync the currency to the UI language once (MERCHANT → 200); gone after reload.
- Old installed apps keep VND.

## Rollback

Revert the PR; the column and data are unchanged.
