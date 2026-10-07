---
name: release-review
description: Use when evaluating or opening a release PR from dev into production (main-real), or when the user says release, deploy to production, đưa lên production, or asks whether dev is safe to ship. Checks hotfix sync, runs the gates CI skips, proves installed iOS/Android apps keep working, checks migrations, env and rollout, and writes a go / no-go verdict into the PR.
---

# Release review: `dev` → `main-real`

A release is a PR from `dev` into `main-real` (example: #358). Merging it deploys the production API on
Railway (`api.anyrent.shop`, migrations run in `apps/api/start.sh`) and the client and admin apps on Vercel.
Customers keep running iOS and Android builds made from `main-real` or older, and those cannot be
force-updated. The question this review answers: **after the merge, does everything already in use keep working?**

The agent evaluates and writes the verdict. A human backs up the database, sets production variables,
merges, and watches the deploy. Never push to `main-real`, merge, or run a production command
(`production-gate.sh` blocks them).

## 0. Set up

```bash
git fetch origin main-real dev
git rev-parse --is-shallow-repository   # true → git fetch --unshallow origin
BASE=origin/main-real HEAD_REF=origin/dev   # or the release PR head
git log --oneline --no-merges $BASE..$HEAD_REF | wc -l
git diff --stat $BASE...$HEAD_REF | tail -1
```

List the PRs and issues in the release (`git log --merges --oneline $BASE..$HEAD_REF`). Every behavior
change should trace to an issue with a `.agent/changes/<n>-<slug>/` folder. Unknown commits are a finding.

## 1. Branch hygiene

```bash
git log --oneline --no-merges $HEAD_REF..$BASE    # must be empty: every hotfix on main-real is in dev
git merge-tree --write-tree $BASE $HEAD_REF >/dev/null && echo clean || echo CONFLICT
```

A hotfix that is only on `main-real` is **no-go**: merge `main-real` into `dev` first (its own PR), or the
release silently reverts it.

## 2. Run the gates CI does not run

No workflow runs on a PR into `main-real`: `ci.yml` triggers on `main`/`develop`, `quality.yml` and
`pr-governance.yml` on `main`/`dev`/`develop`. Run them on the release head and paste the tails into the PR.

```bash
yarn install --frozen-lockfile && yarn db:generate
yarn lint
yarn type-check
SKIP_ENV_VALIDATION=true yarn build
cd tests && yarn install --frozen-lockfile
TZ=UTC yarn test 2>&1 | tail -40
TZ=Asia/Ho_Chi_Minh yarn test 2>&1 | tail -40
```

Some suites need a database or env and fail everywhere. Run the same tests on `$BASE` (a worktree) and
compare: a failure that also happens on `main-real` is pre-existing; **a new failing suite is no-go**.
Write both lists in the PR. Also run every `.agent/evals/cases/*.md` detect step that the diff touches.

## 3. Installed apps keep working (the core check)

Follow `api-compat-review` against `origin/main-real`, for the whole release, not per feature.

1. Changed API surface:

   ```bash
   git diff --name-only $BASE...$HEAD_REF -- apps/api/app/api apps/api/lib packages/database/src \
     packages/utils/src packages/constants/src packages/auth/src packages/validation prisma
   ```

2. Which of those the installed apps call, read on `main-real` (that is what customers run):

   ```bash
   git show $BASE:"apps/mobile/POS ADBD/Library/Services/APIEndpoint.swift" | grep -n "<path>"
   git grep -n "<path>" $BASE -- apps/mobile apps/mobile-android
   ```

   iOS `Codable`: a missing, renamed, retyped, or newly `null` field fails the whole decode.
   Android: check `data/model/` nullability. Old apps send old payloads; zod must still accept them.

3. For every route the old apps call, take the row from the source PR's `api-compat-review` table. If a
   PR has no table, do the review now. Every row needs `file:line` on `origin/main-real`. "Not verified"
   is allowed and stays visible; a guess is not.

4. **Golden-response proof** for each changed mobile endpoint whose response, validation, or business rule
   changed. Use the #499 pattern in `tests/api-compat/`: scenarios on an in-memory store
   (`tests/helpers/fake-order-store.ts`), responses recorded from a checkout of `$BASE`, and a test that
   today's response equals the old one once an allowlist of additive fields is removed.

   ```bash
   git worktree add /tmp/release-base origin/main-real
   cd tests && GOLDEN_ROOT=/tmp/release-base TZ=UTC npx jest --testMatch '**' api-compat/<generator>.ts
   TZ=UTC yarn test api-compat && TZ=Asia/Ho_Chi_Minh yarn test api-compat
   ```

   Existing golden tests (`overview-api-compat.test.ts`) must stay green. A changed endpoint with no golden
   test and no clear "additive only" reading is **no-go** until one is added (its own issue and PR to `dev`).

5. Things that break old apps without touching a response shape:
   - auth: token lifetime, refresh, single-session, new 401/403 codes on flows old apps use
   - order status transitions, pricing, availability, day boundaries (`timezone-dates`)
   - default `limit`, sort order, pagination meaning
   - new required request params or headers
   - `GET /api/mobile/app-config`: raising `IOS_MIN_VERSION` / `ANDROID_MIN_VERSION` forces every user to
     update. Only on purpose, and only once the store build is live.
   - `MOBILE_FEATURES`: **unset or blank turns on every new mobile screen.** Decide the production value
     before the merge (`none` for a dark launch, or the list of keys to turn on).

## 4. Migrations

```bash
git diff --name-only --diff-filter=A $BASE...$HEAD_REF -- prisma/migrations
git diff --name-only --diff-filter=MD $BASE...$HEAD_REF -- prisma/migrations   # must be empty
```

Read each new `migration.sql` (`db-migration`). No-go when it has: `DROP COLUMN` or `DROP TABLE`, a rename,
a narrowed type, `SET NOT NULL` or a new `NOT NULL` column without a default on a populated table, or a
unique index that existing rows may violate. Watch for a plain `CREATE INDEX` on a big table (`Order`,
`OrderItem`, `Payment`): it locks writes while it builds.

Two failure modes specific to this repo:
- `start.sh` starts the server **even when the migration step fails**. The new code then queries columns that
  do not exist and answers 500. The migrations must already have applied cleanly on dev
  (`dev-api.anyrent.shop` deploy log), and the human watches the production log for "Migration failed".
- Rollback means reverting the merge on `main-real`; migrations stay applied. So the **old** API code must
  run on the **new** schema. Additive, nullable or defaulted changes satisfy this. Anything else needs a
  written rollback plan in the PR.

## 5. Env, cron, webhooks, deploy order

```bash
git diff $BASE...$HEAD_REF -- apps packages | grep -E '^\+' | grep -oE 'env\.[A-Z][A-Z0-9_]+' | sort -u
git diff --name-status $BASE...$HEAD_REF -- apps/api/app/api/cron apps/api/app/api/webhooks \
  apps/api/app/api/stripe apps/api/app/api/lemonsqueezy apps/api/app/api/sepay
```

- Each new env var: unset must mean the old behavior, or the PR lists it as "set on production Railway
  before merge" with the value source (never the value).
- New cron route: the scheduler that calls it must be configured; new webhook or payment change: human review.
- Railway and Vercel finish at different times. For a few minutes the new web can call the old API, and the
  old web can call the new API. New web code that needs a new API field must tolerate its absence.
- Open web tabs keep old JS until reload: same checks as old apps, lower severity.

## 6. Data meaning

When the same data now shows different numbers (revenue days, "today" counts, totals), say who notices and
why it is a fix. Revenue and rankings exclude `CANCELLED`; day logic uses the Vietnam civil day.

## 6b. API change log

Every `.agent/api-changes/LOG.md` row with status `dev` whose PR is in this release: check its compat row
against the release diff, then (in the release PR) set the status to `main-real` and, after deploy, fill
"Checked after release" with what was verified on production (old build screen, logs, error rate). A
change in the release diff with no LOG row is a **NO-GO** until the row exists.

## 7. Verdict and PR body

- **NO-GO** if any of: an API change without a LOG row, a hotfix missing from `dev`, a new failing suite, a high-risk compat row, a changed
  mobile endpoint without proof, a destructive migration, a required env var with no plan.
- **GO with conditions**: only human steps remain (backup, variables, store build live first).
- **GO**: nothing open.

Release PR title: `release: dev → main-real (<main themes>)`. Body:

```markdown
## Release

Brings production up to `dev`. Includes: #<pr> (<issue>) …
Hotfix sync: `git log dev..main-real` empty. Merge: clean.
Verdict: GO | GO with conditions | NO-GO — <one line why>

## Gates (run locally; CI does not run on main-real)

lint / type-check / build: <tail>
Jest TZ=UTC and TZ=Asia/Ho_Chi_Minh: <pass count>; pre-existing failures (also on main-real): <list>; new: none
Golden tests: <files> green

## Installed apps (api-compat-review against origin/main-real)

| Route / area | Change | Old iOS | Old Android | Web / stale tab | Proof | Risk |
|---|---|---|---|---|---|---|

## Migrations

<folder>: <what it does> — additive? old code on new schema OK?

## Production config before merge

- [ ] Back up the production database
- [ ] Railway variables: <names> (MOBILE_FEATURES = <value>, min versions unchanged)

## After deploy

- [ ] Railway log: migrations applied, no "Migration failed"; `https://api.anyrent.shop/api/health` OK
- [ ] Old iOS and Android builds from the stores: log in, list orders, create a rental, pick up, return, Overview
- [ ] Web: log in, create an order, print a receipt
- [ ] Rollback: revert this merge on main-real; schema stays (additive)

## Review

- [ ] Human review: production deploy (and auth / payments / migrations if touched)
```

Post the verdict as one comment if the PR already exists. Report findings to the user in their language.
