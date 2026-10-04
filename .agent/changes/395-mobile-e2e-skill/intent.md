# Mobile end-to-end testing like a human tester

Issue: #395 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

Every mobile phase so far was checked by hand: a temporary UI test method pasted into
`POS_ADBDUITests.swift`, hand edits to `build.gradle.kts` to point Android at a local API, ad-hoc adb
uiautomator helpers, and a shared seed database that several agents wrote to at once. Nothing of this was
committed, so each agent rebuilt it, forgot the springboard alert or the onboarding screen, or seeded the wrong
database. The seed script wipes every table, and nothing stops an agent from running it against Railway.

## Proposed outcome

- A skill `mobile-e2e-local` tells an agent when and how to test both apps end to end, with a full checklist,
  screenshot review against the canvas, a bug report format and cleanup.
- `scripts/mobile-e2e/` seeds a dedicated local DB (refuses a non-local URL), starts and stops a local API with
  chosen `MOBILE_FEATURES`, runs a committed iOS UI test on a chosen simulator, and drives Android on a dedicated
  AVD through an adb/uiautomator helper. Every script has `--help`.
- iOS `POS ADBDUITests/AnyRentE2ETests.swift` walks the main features as merchant and as staff and saves
  `NN-feature-step` screenshots, reading credentials, flags and output dir from the environment.
- Android debug builds take `-PapiBaseUrl=…`; no hand edits to `build.gradle.kts`.
- The production gate blocks the seed/regenerate scripts unless the command sets a local `DATABASE_URL`.

## Affected users and systems

Agents and developers. iOS UI test target, Android debug build type, `.claude/hooks/production-gate.sh`,
`AGENTS.md` skill list. No API or app behaviour change; release builds unchanged.

## Constraints

- Several agents run in parallel: simulator, AVD, port and DB are parameters, never shared defaults that collide.
- Never touch the user's emulators `vm_pos`/`vm_kitchen` (5554/5556).
- Logins are single-session; one account per agent run.
- Disk is tight: derived data goes into the output dir and is deleted after the run.

## Open questions

- None.

## Decision log

- 2026-10-04 — Issue #395 opened; scripts in bash, iOS flows as an XCTest UI test, Android via adb helper (Trinh Tran)
