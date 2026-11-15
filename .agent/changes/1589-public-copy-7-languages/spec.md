# Spec — Public pages keep their production copy in 7 languages

Issue: #1589 · Status: in-progress · Intent: ./intent.md

## Behavior

1. For fr, de, th, id, es, ru, zh-TW: `landing.json`, `features.json`, `publicPages.json`, `public.json` equal
   `origin/main-real`, except `landing.pricing.plans.freeTrial.period` (14 days, #1576).
2. `plans.json`: the keys production has (public pricing page) equal production; the management keys stay as on `dev`.
3. `phu-phi-wording`: ja, ko, zh have their own text for every fee label English has, not the English or Vietnamese one.
4. `landing-i18n`, `public-pages-i18n`, `public-pages-price-copy`, `phu-phi-wording` pass.
5. `yarn type-check` has no error that `main-real` does not have: the web language list in `LanguageSwitcher` is typed with the 12 public locales (type only, no behavior change).

## Out of scope

`products.json`, `common.json`, management pages, `locales-pending/`.

## API and data

None.
