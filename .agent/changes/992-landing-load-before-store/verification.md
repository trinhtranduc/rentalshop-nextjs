# Verification — #992

2026-10-15. Only client web navigation changed. No API/native/mobile payload changes.

## Passing
- `cd tests && yarn test web-landing --runInBand`: 3 suites, 43 tests passed.
- `cd apps/client && yarn next lint --file middleware.ts --file lib/store-redirect.ts --file lib/landing-store-navigation.ts`: No ESLint warnings or errors.
- `./node_modules/.bin/tsc --noEmit --skipLibCheck --lib es2022,dom --target es2020 --moduleResolution node apps/client/lib/store-redirect.ts apps/client/lib/landing-store-navigation.ts`: exit 0.
- `BASE_URL=http://localhost:3388 node tests/e2e/web/landing-store-load.web.js`: 7 headed Chrome scenarios passed. Real Next landing HTML is served, a test image holds document load while the visible h1 is captured; releasing it allows the actual effect to redirect. Store requests are intercepted, with load/complete/h1 evidence captured before navigation. iPhone/Android/iPad target their respective stores; desktop/bot/query/cookie opt-out stay on web. Query opt-out cookie verified.
- Artifacts: `/private/tmp/anyrent-992-e2e/results.json`, `*-landing-before-load.png`.
- `git diff --check`: passed.
- Read all active `.agent/evals/cases/*.md`; none apply to web-only navigation timing.

## Repository-wide limitations
- `yarn lint`: Turbo cannot initialize TLS because no keychain is available. Log `/private/tmp/anyrent-992-lint.log`.
- Focused lint including LandingPageClient.tsx: 22 existing errors (unused imports, any, component display names, escaped quotes). Parent version extracted with git show and linted separately also has 22 errors. This change does not touch those lines.
- `yarn type-check`: existing repository failures in pricing tests, missing vitest and other packages. No diagnostics for the changed navigation/middleware/LandingPageClient files. Log `/private/tmp/anyrent-992-types.log`.
- `cd tests && yarn test --runInBand`: unrelated revenue/availability tests fail and railway-deployment.test.js calls process.exit(1). Log `/private/tmp/anyrent-992-tests.log`. Targeted navigation tests pass separately.

## Scope and rollout
No build/deploy/push performed. A blocked or never-finishing page resource delays window load and therefore store navigation, per the requested contract. JS-disabled visitors keep the landing and existing download links.
