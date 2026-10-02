---
name: verify-change
description: Use before claiming a task is done, before committing a fix, and before opening a PR. Runs lint, type-check, and the tests that cover the diff, and checks eval cases under .agent/evals. Use when the user says verify, done, ship, or open a PR.
---

# Verify the change

"Done" means the commands ran and the output was shown. A green claim without output is not done.

## Steps

1. From the diff, list which apps and packages changed.
2. Run the narrowest proof first:
   - bug fix: `cd tests && yarn test <file>` must pass, then `cd tests && yarn test`
   - one package: `npx tsc --noEmit -p apps/<app>/tsconfig.json` or that package's check
3. Then the repo gates from `AGENTS.md`:
   - `yarn lint`
   - `yarn type-check`
   - `cd tests && yarn install --frozen-lockfile && yarn test` when behavior changed
4. Read `.agent/evals/cases/*.md` except `_template.md`. If the diff touches dates, revenue,
   search, roles, or mobile API shapes, run the detect step in the matching case.
5. Web UI changes: exercise the flow in the browser (click, type, submit), including the other
   page that reads the same state. A screenshot of the first paint is not verification.
6. Mobile: if the API shape or a business rule changed, `mobile-parity` names the iOS and Android
   files. Build the affected app when those files changed.
7. Paste the command and the pass/fail tail into the conversation and into the PR test plan.
   If something could not be run, say what and why.

## Not required for a docs-only change

Lint and type-check of the whole monorepo. Still required: the PR links an issue if behavior
or agent instructions changed (`AGENTS.md`, skills, workflows).
