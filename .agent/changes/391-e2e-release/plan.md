# Plan — Release e2e: full local test of both mobile apps

Issue: #391 · Status: accepted · Spec: ./spec.md

## Steps

1. Seed `anyrent_e2e_391` with `scripts/mobile-e2e/seed-local.sh` (local URL only).
2. Move `.worktrees/api-dev-build` to `origin/dev` (no rebuild: no `apps/api`, `packages` or `prisma` change since
   `3d9fd73b`), start it on 3196 with every mobile flag (`scripts/mobile-e2e/api-local.sh start`).
3. iOS: `pod install`, run `scripts/mobile-e2e/ios-e2e.sh --fresh --account merchant`, then `--account staff`, on
   "iPhone 16e" with derived data in `~/Library/Developer/Xcode/DerivedData/w391`. Extend
   `AnyRentE2ETests.swift` with the flows the spec lists that it does not cover yet (auth negatives, customers,
   products), fix broken selectors.
4. Android: build with `-PapiBaseUrl=http://10.0.2.2:3196`, run `scripts/mobile-e2e/android-e2e.sh` on
   `anyrent_icons` / 5564 for merchant and staff, then drive the remaining flows with `adb-ui.sh`.
5. Manual passes for what automation does not reach; review every screenshot.
6. Flag-off sanity: restart the API with `MOBILE_FEATURES=` and reinstall both apps.
7. Report; clean up (API, simulator, emulator, derived data, Android build output).

## Files

- `.agent/changes/391-e2e-release/*` — this change folder
- `apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift` — new flows, selector fixes
- `scripts/mobile-e2e/*.sh` — options found missing during the run (e.g. derived data path), Android scenario steps

## Risks

- Seed wipes every business table: only `anyrent_e2e_391`.
- Single-session logins: one account per device; no curl login with an account under test.
- Disk (~25 GB free): derived data outside `/tmp`, deleted at the end.

## Rollback

Test-only change: revert the commits.
