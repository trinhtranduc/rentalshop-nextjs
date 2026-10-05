# Maestro pilot for mobile e2e

Issue: #447 · Author: Trinh Tran · Status: draft · Created: 2026-10-05

## Problem

Every e2e scenario is written twice: Swift XCUITest on iOS (`apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift`,
~13 flows) and shell + adb/uiautomator on Android (`scripts/mobile-e2e/adb-ui.sh`, `android-e2e.sh`). The Android
scripts are brittle (the #391 run fixed dump timeouts and stale selectors), and parity between the suites is manual.

## Proposed outcome

Evidence for one decision: move AnyRent e2e to Maestro, or keep XCUITest + adb.
One Maestro flow runs on both apps against the existing local stack, and is compared with today's tools.

## Affected users and systems

- No end users. E2E tooling for iOS and Android; maybe a few accessibility ids in both apps.
- Agents and the owner who run the `mobile-e2e-local` skill.

## Constraints

- Reuse the skill's isolated stack: own DB (`E2E_DATABASE_URL`), own API port, own simulator / AVD
  (`anyrent_e2e`, never `vm_pos` / `vm_kitchen` or ports 5554/5556). Seeding only on localhost.
- Logins are single-session: one account per device at a time.
- No credentials in the repo. Disk: stop building below 6 GB free.
- Pilot only: no existing test or script is removed.
- Keep it lean (owner: "đừng làm quá").

## Decision log

- 2026-10-05 — Owner chose to pilot Maestro before switching (Trinh Tran)
