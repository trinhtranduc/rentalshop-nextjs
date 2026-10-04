# Plan — Mobile end-to-end testing like a human tester

Issue: #395 · Status: accepted · Spec: ./spec.md

## Steps

1. Change folder (this) — commit first.
2. `scripts/mobile-e2e/{env,seed-local,api-local,ios-e2e,android-e2e,adb-ui}.sh`.
3. `apps/mobile-android/app/build.gradle.kts`: debug `apiBaseUrl` property. Check the debug network config.
4. `.claude/hooks/production-gate.sh`: seed guard; test with piped JSON.
5. iOS `POS ADBDUITests/AnyRentE2ETests.swift`, added to the UI test target with the `xcodeproj` gem.
6. `.claude/skills/mobile-e2e-local/SKILL.md`; one line in the `AGENTS.md` domain skill list.
7. Verify: seed `anyrent_mobile_e2e`, API on a free port, `ios-e2e.sh --fresh` as merchant then staff, review
   screenshots, Android when an AVD is free.

## Files

- `scripts/mobile-e2e/*` — new tooling
- `apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift`, `apps/mobile/POS ADBD.xcodeproj/project.pbxproj` — UI test
- `apps/mobile-android/app/build.gradle.kts` — gradle property
- `.claude/hooks/production-gate.sh` — seed guard
- `.claude/skills/mobile-e2e-local/SKILL.md`, `AGENTS.md` — skill

## Risks

- The seed wipes every table: guarded twice (script and hook).
- Release Android build must keep the production URL: only the debug line changes.
- UI test is tolerant of copy changes; soft assertions where the UI may vary.

## Rollback

Revert the PR. Nothing ships to users.
