# AGENTS.md — AnyRent

Shared instructions for every coding agent (Claude, Cursor, Codex, and others).
Claude-only wiring lives in `CLAUDE.md`. Project SDLC files live in `.agent/`.
Procedures live in `.agents/skills/` (SDLC) and `.claude/skills/` (domain).

If this file and `.cursorrules` disagree, this file wins. `.cursorrules` is legacy detail.

## Product

Rental-shop POS and management platform. Yarn 1 + Turborepo monorepo:

- `apps/api` :3002 — Next.js 14 API (Railway)
- `apps/admin` :3001 — admin dashboard (Vercel)
- `apps/client` :3000 — merchant app (Vercel)
- `packages/*` — `@rentalshop/*` shared code
- `prisma/schema.prisma` — PostgreSQL
- `apps/mobile` — iOS (Swift), `apps/mobile-android` — Android (Kotlin)

`dev` deploys to dev-api.anyrent.shop. `main` is production. Pull requests target `main`.

## SDLC (do not skip stages)

Agents write code faster than planning, review, and verification. Those stages stay mandatory.
Map of the [AI-native SDLC playbook](https://academy.claude.com/courses/ai-native-sdlc-playbook):

| Stage | Where | Skill |
|---|---|---|
| 1. Capture what is wanted, why, and the constraints | `.agent/changes/<issue>-<slug>/intent.md` | `capture-intent` |
| 2. Turn intent into a spec and a plan before coding | `spec.md`, `plan.md` in the same folder | `capture-intent` |
| 3. Open a GitHub issue **before** a branch or a PR | issue templates in `.github/ISSUE_TEMPLATE/` | `issue-first` |
| 4. Implement only what the issue and plan say | code + domain skills | `implement-issue` |
| 5. Gates while the agent acts (prod, secrets, tests) | `.claude/hooks/production-gate.sh` | `protocol-guardian` |
| 6. Prove the change | lint, type-check, tests, eval cases | `verify-change` |
| 7. Open a PR that links the issue; review in layers | `.github/PULL_REQUEST_TEMPLATE.md` | `review-pr` |
| 8. A miss or hotfix becomes a new eval and a new intent | `.agent/evals/cases/` | `incident-to-eval` |

No pull request without an issue. No implementation without `intent.md` + `spec.md` + `plan.md`
for anything that is not a one-line typo. Bug fixes still start from a failing test (`bug-fix-tdd`).

## Commands

Run the relevant commands before calling work done, and show the output.

| Task | Command | Healthy result |
|---|---|---|
| Install | `yarn install --frozen-lockfile && yarn db:generate` | no lockfile changes |
| Dev (all 3 apps) | `yarn dev:all` | client/admin/api on 3000/3001/3002 |
| Lint | `yarn lint` | 0 errors |
| Type check | `yarn type-check` or `npx tsc --noEmit -p apps/<app>/tsconfig.json` | 0 errors |
| Build | `yarn build` (`SKIP_ENV_VALIDATION=true` if no env) | "Compiled successfully" |
| Tests | `cd tests && yarn install --frozen-lockfile && yarn test` | all green |
| One test file | `cd tests && yarn test <name>` | that file green |
| Local migration | `yarn db:migrate:dev` | new folder in `prisma/migrations/` |
| iOS | `cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'generic/platform=iOS Simulator' build` | BUILD SUCCEEDED |
| Android | `cd apps/mobile-android && ./gradlew :app:assembleDebug` | BUILD SUCCESSFUL |

Never run `prisma migrate reset`, `db:reset-railway`, `*:prod`, or `railway … --environment production`
without an explicit human go for that one command (`RELEASE_APPROVED=1`). The hook in
`.claude/hooks/production-gate.sh` blocks these.

## Conventions

- **API routes** (skill `api-route-standard`): `with*Auth` from `@rentalshop/auth/server`, zod, `ResponseBuilder`, `handleApiError`, data via `db` from `@rentalshop/database`.
- **Dual IDs:** database primary keys are CUIDs. Every external surface (API JSON, URLs, mobile, forms) uses numeric `publicId` / `id`. Never leak a CUID to a client.
- **Roles:** `ADMIN`, `OPS`, `ARTICLE`, `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`. Scope (`userScope`) is enforced in the API. UI helpers only hide controls.
- **Orders:** `RENT` / `SALE`. Rent: `RESERVED → PICKUPED → RETURNED`. Sale: `RESERVED → COMPLETED`. Plus `CANCELLED`. Number format `ORD-{outletId}-{sequence}`.
- **Time** (skill `timezone-dates`): store UTC, reason in Vietnam civil days (`Asia/Ho_Chi_Minh`). A day is a `YYYY-MM-DD` key via `getUtcRangeForDateKeys` / `getLocalDateKey`. Never use `toISOString().split`, `setHours(0,0,0,0)`, `getDate()`, or `toLocaleDateString()` for day logic. Date tests run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`. A same-day pickup and return still occupies that day.
- **Shared code:** UI in `packages/ui`, helpers in `packages/utils`, types in `packages/types`. Frontends call the API through `*Api` / `authenticatedFetch`, never raw `fetch`.
- **i18n** (skill `i18n-keys`): a new key goes into `locales/{en,vi,ja,ko,zh}`. Error codes need `errors.json` entries.
- **Mobile** (skill `mobile-parity`): an order, availability, or response-shape change updates iOS and Android.
- **Migrations** (skill `db-migration`): never edit an applied file under `prisma/migrations/`. Add a new migration.
- **Config:** extend `tsconfig.base.json` / `tsup.config.base.ts`. Never commit `.env*`, keystores, or `*.p8`.
- **Commits:** `type(scope): subject`. Scopes: `api`, `admin`, `client`, `mobile`, `orders`, `availability`, `seo`. Branches: `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `hotfix/<issue>-<slug>`.
- **Same mistake twice:** add an eval case and a line under "Things agents get wrong" in the same PR.

## Where things are

- `apps/api/app/api/**/route.ts` — route handlers
- `apps/api/lib/` — API-only logic
- `packages/database/src/*.ts` — one file per model; `client.ts` is the Prisma singleton. Never `new PrismaClient()` in a route.
- `packages/auth/src/server` — auth wrappers. `packages/validation` — zod schemas.
- `packages/ui/src/components` — shared React components
- `tests/` — standalone Jest project
- `docs/` — start with `DEPLOYMENT_STANDARD.md`, `DATABASE_MIGRATION_WORKFLOW.md`, `ERROR_HANDLING_SYSTEM.md`
- `.agent/changes/` — one folder per issue. `.agent/evals/cases/` — regressions that must stay caught
- `intent/` — older intent drafts. New work goes in `.agent/changes/`

## Skills

Read the skill file when the trigger matches. Do not wait for the user to name the skill.

SDLC (`.agents/skills/`):

- `capture-intent` — new feature, unclear ask, or "write a spec"
- `issue-first` — before any branch, commit series, or PR
- `implement-issue` — coding against an existing issue
- `protocol-guardian` — destructive commands, secrets, migrations, test edits during a fix
- `verify-change` — before saying done
- `review-pr` — before or during pull request review
- `incident-to-eval` — hotfix, production bug, or a repeated agent mistake

Domain (`.claude/skills/`):

- `api-route-standard` — any route handler
- `timezone-dates` — any date or day logic
- `db-migration` — schema change
- `i18n-keys` — user-facing string or error code
- `mobile-parity` — API shape or business-rule change
- `bug-fix-tdd` — any bug or hotfix

## Things agents get wrong

- Mixing `??` with `||` in one expression without parentheses. Next 14 fails the API build.
- Using the UTC day instead of the Vietnam civil day for "today", calendar taps, availability, and income-by-day.
- Revenue and top-product rankings must exclude `CANCELLED` orders.
- Order and customer search must be scoped to the caller's merchant, and match by word prefix, accent-insensitively.
- `OUTLET_STAFF` cannot edit product prices. Hide the control in the UI and reject it in the API.
- Never edit an applied migration. Never `new PrismaClient()` in a route.
- A change to an order or availability endpoint usually needs both mobile apps.
- Opening a PR that does not name the issue it closes.
