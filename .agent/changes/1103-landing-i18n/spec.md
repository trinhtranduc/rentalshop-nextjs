# Spec (#1103)

1. `apps/client/lib/public-content/landing-messages.ts` exports `publicLandingMessages(locale)` for all 12 public locales.
   - vi, en, ja, ko, zh: their `locales/<l>/landing.json`.
   - ru, zh-TW, fr, de, th, id, es: new full `locales/<l>/landing.json`, deep-merged over English (a key missing later still shows English, never empty), then the reviewed `public.json` hero / features / aiSearch / blog titles applied as today.
   - `layout.tsx` uses it in `getPublicContentMessages`.
2. Hardcoded copy moves to keys (all 12 locales):
   - `hero.tagline`, `hero.trustStores`, `hero.trustRating`, `hero.trustSecure`, `hero.imageAlt`
   - `aiSearch.snap`, `aiSearch.learnMore`
   - `industries.{title,subtitle,aoDai,weddingDress,equipment,costume}.{title,desc}`
   - `whyChoose.badge`, `testimonials.badge`, `blog.badge`, `pricing.priceLabel`, `pricing.additionalPricingSr`
   - `stats.*` (existing keys, now used)
   - `footer.imageSearch`, `footer.industries.{title,aoDai,weddingDress,equipment,costume}`
   - `contactButtons.{zalo,whatsapp,telegram,zaloTitle,whatsappTitle,telegramTitle,zaloQrTitle,zaloQrHint,openZalo,close,zaloQrAlt,greeting}`
   - `sections.*` (landmark aria-labels)
3. `orderWorkflow.flowLabel` is translated (vi/ja/ko/zh were English status codes); en unchanged.
4. Links keep their current targets.

## Tests
`tests/landing-i18n.test.ts`: every English landing key exists non-empty in all 12 locales; no Vietnamese in non-vi locales; no value equal to English in non-en locales except an allowlist (names, numbers, channels, discounts); no Vietnamese JSX text and none of the old hardcoded English phrases in the landing source files.
