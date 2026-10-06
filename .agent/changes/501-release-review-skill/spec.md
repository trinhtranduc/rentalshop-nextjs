# Spec

- New SDLC skill `.agents/skills/release-review/SKILL.md`, linked from `.claude/skills/release-review`.
- Triggers: a PR into `main-real`, "release", "deploy to production", "đưa lên production".
- The skill is grounded in how this repo ships today:
  - Release = PR `dev → main-real` (e.g. #358). Hotfixes land on `main-real` directly and must be back in `dev`.
  - No workflow runs on a PR into `main-real` (`ci.yml`: main/develop; `quality.yml`, `pr-governance.yml`:
    main/dev/develop), so lint, type-check, build and Jest run locally and their output goes in the PR.
  - Railway runs `apps/api/start.sh`, which starts the server even when the Prisma migration step fails.
  - `MOBILE_FEATURES` unset turns on every new mobile screen.
  - Golden-response tests (`tests/api-compat`, #499) are the proof for changed mobile endpoints.
- Output: a release PR body with a per-route compatibility table and a go / no-go verdict.
- A no-go item blocks the merge recommendation; the agent never merges or deploys.
- `AGENTS.md` lists the skill and the SDLC table names it.
