# Spec — Mobile end-to-end testing like a human tester

Issue: #395 · Status: accepted · Intent: ./intent.md

## Behavior

1. Every script in `scripts/mobile-e2e/` runs under `set -euo pipefail`, passes `bash -n`, and prints usage on `--help`.
2. `env.sh` holds overridable defaults: `DATABASE_URL`, `E2E_API_PORT`, `MOBILE_FEATURES`, `E2E_SIMULATOR`,
   `E2E_AVD`, `E2E_AVD_PORT`, `E2E_OUT`, merchant and staff test accounts.
3. `seed-local.sh` refuses unless the `DATABASE_URL` host is `127.0.0.1`/`localhost` and the db name is set; it
   prints the masked URL, creates the DB if missing, runs `prisma db push`, tries `CREATE EXTENSION unaccent`,
   runs `scripts/regenerate-entire-system-2025.js`, and prints the seed accounts.
4. `api-local.sh start|stop|status` runs `next start` on the port with test JWT secrets and `MOBILE_FEATURES`, waits
   for `/api/health`, and keeps a pid and log in the output dir. `--build` builds the API from this checkout first.
   `E2E_API_DIR` runs a prebuilt API from another checkout.
5. `ios-e2e.sh` runs `POS ADBDUITests/AnyRentE2ETests` on the chosen simulator with `API_BASE_URL` pointing at the
   local API, passes credentials, flags and output dir through `TEST_RUNNER_*`, supports `--fresh`, stores
   screenshots in `<out>/ios/` and prints passed/failed per test.
6. `android-e2e.sh` refuses `vm_pos`, `vm_kitchen` and ports 5554/5556; boots the AVD if needed; builds debug with
   `-PapiBaseUrl=http://10.0.2.2:<port>`; installs, launches, runs a scenario via `adb-ui.sh`; screenshots go to
   `<out>/android/`.
7. `adb-ui.sh` offers `dump`, `tap`, `type`, `back`, `swipe up|down`, `shot`, `wait` on `emulator-<port>`.
8. Android debug `API_BASE_URL` is `project.findProperty("apiBaseUrl")` or the dev URL; release is unchanged.
9. `AnyRentE2ETests` handles the notification alert and onboarding, logs in from env, relaunches once, and runs
   independent test methods per flow (home, cart rent, cart sale, orders, order detail, calendar, overview,
   settings/logout, staff restrictions), skipping steps whose flag is off. Each step saves `NN-feature-step`.
10. The production gate blocks `db:regenerate-system`, `railway:seed` and `regenerate-entire-system-2025` unless
    the same command sets a `DATABASE_URL` containing `127.0.0.1` or `localhost`; `scripts/mobile-e2e/seed-local.sh`
    is allowed (it checks itself).
11. The skill `.claude/skills/mobile-e2e-local/SKILL.md` exists and is listed in `AGENTS.md`.

## Out of scope

Fixing app bugs found by the run (they are reported), CI integration, new AVDs, API changes.

## API and data

None. The seed writes only to the dedicated local database.

## Acceptance

- [ ] `bash -n` and `--help` for every script
- [ ] Hook piped with sample JSON: allowed and blocked exit codes
- [ ] Seed of `anyrent_mobile_e2e` with row counts; API start/stop on the chosen port
- [ ] iOS run as merchant and staff with per-test pass/fail and screenshots reviewed
- [ ] Android run, or the exact command recorded when no AVD is free
