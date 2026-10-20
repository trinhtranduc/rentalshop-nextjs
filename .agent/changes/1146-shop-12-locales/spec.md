# Spec — #1146

## Locale of a shop page

`shopLocale(publicCookie, appCookie)`: `NEXT_PUBLIC_LOCALE` if it is one of the 12, else `NEXT_LOCALE` if it is one of the 12, else `vi`.
The middleware runs on `/{tenantKey}/products` and `/{tenantKey}/booking/{code}` and passes it in `x-anyrent-public-locale`,
so the root layout renders `<html lang>` and the messages for that locale (the landing already works this way).

## App locale

`appLocaleFor(value)`: `vi|en|ja|ko|zh` → itself, `zh-TW` → `zh`, another public locale → `en`, anything else → `vi`.
Used by the root layout, `generateMetadata`, `i18n.ts` and `lib/locale.ts`.

## Strings

- `products.public.*` (95 keys) and the 10 shop keys of `products` (`uncategorized`, `productsPlural`, `noProductsFound`, `noProducts`,
  `tryDifferentSearch`, `checkBackLater`, `clearFilters`, `storeNotFound`, `storeNotFoundMessage`, `goToHomepage`)
  in all 12 locales. New files `locales/{ru,zh-TW,fr,de,th,id,es}/products.json` hold only these; merged over English.
  ja / ko / zh get the 10 missing shop keys.
- `common.pagination` (`showing`, `to`, `of`, `itemsPerPage`, `apply`) for the 7 new locales in `locales/<l>/common.json`.

## Formats

- `formatDayKey(key, locale)`: vi → `dd/mm/yyyy` (unchanged); others → `Intl` numeric date.
- Calendar weekday headers and month title: vi unchanged; others from `Intl`.
- Tracking time: vi unchanged `HH:mm dd/mm/yyyy` (Vietnam time); others `Intl` in `Asia/Ho_Chi_Minh`.
- `formatShopMoney(amount, currency, locale)`: vi unchanged (`500.000đ`, other currencies `en-US`); others `Intl` currency style
  in the shop currency with that locale's grouping.

## Tests

- `tests/shop-12-locales.test.ts`: helpers (`shopLocale`, `appLocaleFor`, `isShopPath`), key and ICU-argument parity for the shop keys
  across 12 locales, no Vietnamese or English left in the new ones, vi formats unchanged.
- `locales-valid-json`.
