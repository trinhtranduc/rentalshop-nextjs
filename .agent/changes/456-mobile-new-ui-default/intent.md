# New mobile UI on by default

Issue: #456 · Author: Trinh Tran · Status: in progress · Created: 2026-10-05

## Problem

The new mobile screens are on only when their keys are listed in `MOBILE_FEATURES`. Unset, the API
returns all 8 flags false (dev-api today), and a clean install of iOS/Android shows the old screens,
including the old login, until a config is cached.

Owner (2026-10-05): "mặc định được không, không cần bật".

## Proposed outcome

- API: `MOBILE_FEATURES` unset/blank → all 8 features on; a list → only those; `none` → all off.
- Apps: no cached config, failed fetch, or no `features` → all new-UI flags on. An explicit `false`
  still turns that screen off. Old screens stay as the fallback.

## Affected users and systems

- All mobile roles; no scope change.
- api (`apps/api/lib/mobile-app-config.ts`), iOS (`AppConfig`, `FeatureFlags`), Android
  (`AppConfigModels`, `FeatureFlags`, `appConfigFromJson`), docs, `mobile-e2e-local` skill.

## Constraints

- Dev first; nothing to production here.
- Installed apps built from `main-real` never call `/api/mobile/app-config`.
- The production API has no `/api/mobile/app-config` yet: new app builds pointed at production get a
  404 → defaults → new UI. When this API reaches production, set `MOBILE_FEATURES` to a list or `none`
  there for a staged rollout.
- iOS is the reference behaviour.

## Decision log

- 2026-10-05: a flag is off only when a config explicitly says `false`; a key missing from a present
  `features` map counts as on (same rule as "no config").
