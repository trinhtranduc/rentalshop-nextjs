# Plan — New mobile UI on by default

Issue: #456 · Status: in progress · Spec: ./spec.md

Base `origin/dev`, branch `feat/456-mobile-new-ui-default`, one PR into `dev`.

## Steps

1. Tests first (committed failing): `tests/api/mobile-app-config.test.ts`, iOS
   `POS ADBDTests/AppConfigTests.swift`, Android `AppConfigDefaultsTest.kt` + the existing parse test.
2. API `apps/api/lib/mobile-app-config.ts`: unset/blank → all; `none` → none; list → listed.
   Route doc comment; `docs/API_MOBILE_APP_CONFIG.md`, `docs/ENVIRONMENT_VARIABLES.md`,
   `.claude/skills/mobile-e2e-local/SKILL.md`.
3. iOS: `AppConfig.features` default all; decode treats a missing map / missing key as on;
   `FeatureFlags` defaults to all when there is no cache.
4. Android: `AppConfig.features` default all; `appConfigFromJson` missing map / key → on;
   `FeatureFlags` starts with all.

## Verify

```bash
cd tests && npx jest api/
npx tsc --noEmit -p apps/api/tsconfig.json
cd apps/mobile && xcodebuild ... build && xcodebuild test -only-testing:"POS ADBDTests/AppConfigTests"
cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
```

## Rollback

Set `MOBILE_FEATURES=none` on the API (applies within 5 minutes), or revert the PR.
