# Plan — #946

1. Test first: `tests/web-landing-store-redirect.test.ts` for `landingStoreRedirect` and `isIpadDesktop` (commit).
2. `apps/client/lib/store-redirect.ts`: store URLs (StoreBadges re-exports them), pure detection + `?web=1` rule.
3. `apps/client/middleware.ts`, matcher `/` only: redirect 307 or set the `?web=1` cookie.
4. `LandingPageClient.tsx`: iPadOS desktop-UA fallback via `isIpadDesktop` + same `?web=1` / cookie rule.
5. Verify: tests, tsc client vs origin/dev, lint changed files, client build, headed Chrome device emulation, curl as Googlebot.
