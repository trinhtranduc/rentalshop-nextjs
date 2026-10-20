# Plan — Stale mobile e2e tests

Issue: #1156 · Status: done · Spec: ./spec.md

## Steps

1. Run each stale test on a local seeded stack (own DB, API :3286, own simulator and AVD, visible windows).
2. Read the screens (screenshots, uiautomator dumps) and change only the expectations that the UI changed.
3. Rerun until green; run the Node checkers on the logs.

## Files

- `apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift` — 4b, 6b, 7m, 1d expectations
- `tests/e2e/mobile/android-flow-calendar.sh`, `android-flow-todo.sh`, `android-lib.sh` — row parsing, cart bar, stepper
- `tests/e2e/mobile/calendar-check.js`, `todo-check.js` — compare tag + total rows with the API
