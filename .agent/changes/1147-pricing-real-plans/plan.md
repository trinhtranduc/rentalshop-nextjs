# Plan

1. Failing tests: `tests/pricing-real-plans.test.ts` (cards per locale, Enterprise contact, failure fallback) and `tests/page-title-no-double-brand.test.ts`. Commit `test(client): ...`.
2. Helper `buildPricingCards` / `fallbackPricingCards` in `pricing-format.ts`.
3. `PricingClient` takes `plans` prop; both pricing pages fetch server-side.
4. Titles: `{ absolute }` in the 7 pages.
5. Verify: tests under TZ=UTC and TZ=Asia/Ho_Chi_Minh, locales-valid-json, tsc client vs baseline, eslint; headed Chrome screenshots of /pricing, /ru/pricing, /en/pricing and language switch.
