# Plan — #1146

1. `apps/client/lib/public-content/shop-locale.ts`: `isShopPath`, `shopLocale`, `appLocaleFor`, `intlLocale`, `shopMessages` (products + common overrides).
2. Middleware: add the two shop matchers; set `x-anyrent-public-locale` from `shopLocale`.
3. Root layout / `i18n.ts` / `lib/locale.ts`: app locale through `appLocaleFor`; public messages for the 7 new locales merge the shop strings.
4. Shop components: `LanguageSwitcher` in public mode (reload the same URL); locale-aware dates, weekdays, month, money.
5. Locale files: 7 new `products.json` + `common.json` (pagination); 10 shop keys for ja / ko / zh.
6. Tests, tsc vs origin/dev, eslint changed files, headed Chrome e2e (ru, fr, th, de; booking sheet, tracking; login with a ru cookie).
