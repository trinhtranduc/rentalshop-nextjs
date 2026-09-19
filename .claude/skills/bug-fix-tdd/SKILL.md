---
name: bug-fix-tdd
description: Use for any bug report, hotfix or regression in the web/API code. Enforces the failing-test-first loop from the AI-native SDLC playbook and protects the test from being weakened during the fix.
---

# Bug fix = failing test first

1. **Reproduce as a test** in `tests/` (standalone jest project: `cd tests && yarn install --frozen-lockfile`).
   Prefer importing the real function (`require('../packages/database/src/<model>')`, `apps/api/lib/*`) like the
   existing `tests/*-actual.test.*` files do. Pure rules (availability overlap, revenue, date windows) get a
   `.test.ts` next to the existing ones. Name it after the bug: `tests/<area>-<symptom>.test.ts`.
2. **Run it and confirm it fails for the right reason:** `cd tests && yarn test <file>`. Paste the failing
   assertion into the conversation.
3. **Commit the test alone:** `test(<scope>): reproduce <symptom>`.
4. **Enter fix mode:** run the rest of the session with `FIX_MODE=1` in the environment. The
   `production-gate.sh` hook now rejects edits to `tests/**`, `*.test.*`, `*Tests.swift`, `*Test.kt`.
5. **Fix the implementation** at the root cause. Check "Things Claude gets wrong" in `CLAUDE.md` first. Most
   hotfixes so far were VN-day vs UTC (apply `timezone-dates`), merchant scoping, cancelled orders counted in
   revenue, or a role check missing on the API side.
6. **Verify:** the new test passes, the whole suite passes (`yarn test` in `tests/`), plus `yarn lint` and
   `yarn type-check` at the root. Show the output.
7. **Widen coverage** when a sibling can have the same bug (calendar by-date **and** availability endpoints):
   add a case to the same file, not a new file.
8. **Mobile side effects:** if the fix changes an API response, apply `mobile-parity`.
9. **Commit** `fix(<scope>): <what changed>`. If this is the second time the mistake occurred, add a line under
   "Things Claude gets wrong" in `CLAUDE.md` in the same PR.
10. **Hotfix branches** are `hotfix/<slug>` off `main`; PR to `main`, then back-merge into `dev`.
