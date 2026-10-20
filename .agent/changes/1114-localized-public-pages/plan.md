# Plan — #1114

1. Tests first (`tests/public-pages-i18n.test.ts`, extend `public-post-locales` / `web-landing-middleware`): path
   helper table, middleware matcher + vi redirects, keys in all 12 locales, no Vietnamese/English leftovers,
   metadata canonical/hreflang, sitemap URLs, no Vietnamese literals in the shared page components. Commit red.
2. `packages/constants/src/public-locales.ts`: `PUBLIC_PAGES`, `publicPagePath`, `publicLocaleFromPath` accepts
   `/{locale}/{page}`.
3. `apps/client/middleware.ts`: matcher + vi redirect for the page paths.
4. Locales: `locales/*/publicPages.json` (12), `locales/{ru,zh-TW,fr,de,th,id,es}/{plans,features}.json`,
   screenshot labels in `features.json` (12); layout merges them for the newer locales; `pricing-format` Intl tags.
5. `apps/client/lib/public-content/public-pages.ts` (messages + metadata), shared content components, routes
   `app/[tenantKey]/{pricing,features,download,image-search}/page.tsx`; Vietnamese pages reuse the components.
6. Link hook for header/footer/landing/features; landing review JSON-LD vi only; sitemap.
7. Verify: jest (UTC), locales JSON, eslint/tsc touched files, client build, headed browser screenshots
   (ru, ja, th, en × 4 pages) under the scratchpad.

Rollback: revert the PR; Vietnamese URLs never changed.
