# Spec — #606
1. AGENTS.md: API compatibility convention requires the review in the issue and the PR, a LOG row, and forbids redefining fields old apps read; two lines in "Things agents get wrong".
2. `.agent/api-changes/LOG.md` exists, documents its columns and statuses, backfilled for #581, #595, #597, #592, #605.
3. Skill `api-compat-review`: issue-time + PR-time passes; step 7 (track). Skill `release-review`: 6b (status update, post-deploy check, NO-GO without a row).
4. PR template: `## API compatibility` section. Issue templates (feature, bug, agent-task): required "API impact (installed apps)" field.
5. `pr-governance.yml` job `api-impact`: changed paths under `apps/api/`, `prisma/`, `packages/{database,utils,constants,auth,validation}/src/` (tests excluded) → require the section in the PR body and a change to LOG.md; otherwise pass.
6. Eval case `.agent/evals/cases/606-api-change-untracked.md`.
