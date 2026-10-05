# Spec — New mobile UI on by default

Issue: #456 · Status: in progress · Intent: ./intent.md

## Behavior

API `GET /api/mobile/app-config` → `features`:

| `MOBILE_FEATURES` | features |
|---|---|
| unset, `""`, whitespace | all 8 true |
| `newOrders,newAuth` | only those true, others false |
| `none` (any case, trimmed) | all false |
| `newOrders, unknown` | `newOrders` true; unknown ignored |
| `unknown` only | all false (a non-empty list is an explicit rollout) |

Apps (iOS and Android alike):

1. No cached config (first launch) → every new-UI flag on; a clean install shows LoginV2 / Android new login.
2. Fetch fails and no cache → flags stay on.
3. A config without `features`, or with a key missing from `features` → that flag on.
4. A config with `"<key>": false` → that screen off (old screen).
5. Old screens remain in code behind a false flag.

## Out of scope

Removing old screens, version gates, production env changes.

## API and data

No shape change. The value of `features` changes from all-false to all-true when the env is unset.

## Acceptance

- [ ] `tests/api/mobile-app-config.test.ts`: unset / "" / list / none cases
- [ ] iOS `AppConfigTests`: no-cache default, missing `features`, explicit false
- [ ] Android unit tests: same cases
