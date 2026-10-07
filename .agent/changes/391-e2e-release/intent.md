# Release e2e: full local test of both mobile apps with every flag on

Issue: #391 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

Phases 0–8 of the mobile redesign (#363, #385) were each checked on their own branch with only their own flag on.
Nobody has walked the whole app, on both platforms, with every `MOBILE_FEATURES` flag on at once, as merchant and as
outlet staff. Before the flags go on for Railway dev and the stores (#391 steps 2–5), regressions between phases,
role leaks and platform drift have to be found locally.

## Proposed outcome

- One run of the latest `dev` on iOS (simulator) and Android (emulator) against a local API with
  `MOBILE_FEATURES=newOrders,newOrderDetail,newProducts,newCalendar,newOverview,newSettings,newAuth,newCustomers`
  on a freshly seeded, dedicated local database.
- A pass/fail table per area × platform × role, and one bug entry per app bug (repro steps, platform, role,
  screenshot) for the owner to file as issues.
- A flag-off sanity pass (empty `MOBILE_FEATURES`): the old screens still open on both apps.
- Test tooling fixes (iOS UI test selectors, Android scenario, script options) are committed; app bugs are not fixed here.

## Affected users and systems

Merchant (`MERCHANT`) and `OUTLET_STAFF` accounts on iOS and Android. `scripts/mobile-e2e/*`,
`apps/mobile/POS ADBDUITests/AnyRentE2ETests.swift`. No API, app or schema change.

## Constraints

- Local only: database `anyrent_e2e_391` on `127.0.0.1:54343`; never a shared or remote database, never `migrate reset`.
- Shared prebuilt API (`.worktrees/api-dev-build`) is only run, on port 3196.
- Own devices only: simulator "iPhone 16e", AVD `anyrent_icons` on port 5564. Never `vm_pos` / `vm_kitchen`.
- Single-session logins: one account per device at a time.
- No push, no PR from this run.

## Open questions

- The seed has no merchant without an outlet; that case is covered only through sign-up if the flow creates one.

## Decision log

- 2026-10-04 — Run every flag at once rather than per phase, because the release turns them on together on dev (owner).
- 2026-10-04 — Bugs are reported, not fixed, in this run (owner).
