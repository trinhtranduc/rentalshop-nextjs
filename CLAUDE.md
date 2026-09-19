# CLAUDE.md — AnyRent (rentalshop-nextjs)

Rental-shop POS/management platform. Yarn 1 + Turborepo monorepo: 3 Next.js 14 apps (`apps/api` :3002,
`apps/admin` :3001, `apps/client` :3000), shared `packages/*` (`@rentalshop/*`), Prisma/PostgreSQL
(`prisma/schema.prisma`, 40 models), native iOS (`apps/mobile`, Swift) and Android (`apps/mobile-android`, Kotlin).
Deploy: API on Railway, admin/client on Vercel. `dev` branch → dev-api.anyrent.shop, `main` → production.

## Commands (run these before saying a task is done, and show the output)

| Task | Command | Healthy result |
|---|---|---|
| Install | `yarn install --frozen-lockfile && yarn db:generate` | no lockfile changes |
| Dev (all 3 apps) | `yarn dev:all` | client/admin/api on 3000/3001/3002 |
| Lint | `yarn lint` | 0 errors (CI blocks on this) |
| Type check | `yarn type-check` (root) or `npx tsc --noEmit -p apps/<app>/tsconfig.json` | 0 errors |
| Build | `yarn build` (`SKIP_ENV_VALIDATION=true` if no env) | "Compiled successfully" for every app |
| Tests | `cd tests && yarn install --frozen-lockfile && yarn test` | all green; `yarn test <name>` for one file |
| Local migration | `yarn db:migrate:dev` | new folder in `prisma/migrations/` |
| iOS | `cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'generic/platform=iOS Simulator' build` | BUILD SUCCEEDED |
| Android | `cd apps/mobile-android && ./gradlew :app:assembleDebug` | BUILD SUCCESSFUL |

Never run `prisma migrate reset`, `db:reset-railway`, `*:prod`, or `railway … --environment production`
without an explicit human go. The PreToolUse hook in `.claude/hooks/production-gate.sh` blocks these
unless `RELEASE_APPROVED=1` is set for that one command.

## Workflow (AI-native SDLC)

1. **Plan first.** Non-trivial work starts in plan mode. Features start from an `intent/<slug>.md`
   (template in `intent/TEMPLATE.md`): problem, outcome, affected users/systems, constraints, open questions.
2. **Bug fix = failing test first.** Reproduce in `tests/` (jest), confirm it fails, commit, then fix
   the code without editing the test. Set `FIX_MODE=1` so the hook rejects test edits during the fix.
3. **Done means verified.** Lint + type-check + the relevant tests pass and the output is shown.
4. **Commits:** Conventional Commits `type(scope): subject`, scopes like `api`, `admin`, `client`,
   `mobile`, `orders`, `availability`, `seo`. Branches: `feat/*`, `fix/*`, `hotfix/*`. PRs target `main`.
5. **Same mistake twice → add it to "Things Claude gets wrong" below in the same PR.**
6. **Skills** in `.claude/skills/` hold the step-by-step procedures; use them when the trigger matches:
   `api-route-standard` (any route handler), `timezone-dates` (any date/day logic), `db-migration`
   (schema change), `i18n-keys` (any user-facing string or error code), `mobile-parity` (API shape or
   rule change), `bug-fix-tdd` (any bug or hotfix).

## Conventions that matter

- **API route shape** (see `.claude/skills/api-route-standard/SKILL.md`): wrap the handler with a
  `with*Auth` from `@rentalshop/auth/server`; validate with zod; return `ResponseBuilder.success|error|validationError`
  from `@rentalshop/utils`; `catch` → `handleApiError(error)`; data access via `db` from `@rentalshop/database`.
- **Dual IDs:** DB primary keys are CUIDs; every external surface (API JSON, URLs, mobile, forms) uses
  the numeric `publicId`/`id`. The API layer translates. Never leak a CUID to a client.
- **Roles:** `ADMIN`, `OPS`, `ARTICLE`, `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` (`@rentalshop/constants`).
  Data scoping (`userScope`) is enforced in the API. UI permission helpers only hide controls.
- **Orders:** types `RENT`/`SALE`; statuses `RESERVED → PICKUPED → RETURNED` (rent) or `RESERVED → COMPLETED`
  (sale), plus `CANCELLED`. Order number `ORD-{outletId}-{sequence}`.
- **Time (most frequent bug class, see `.claude/skills/timezone-dates`):** DB stores UTC; the business
  runs on Vietnam civil days (UTC+7) and servers run in UTC. A "day" is a `YYYY-MM-DD` key. Convert with
  `getUtcRangeForDateKeys` / `getLocalDateKey` from `@rentalshop/utils`, filter in SQL, and never use
  `toISOString().split`, `setHours(0,0,0,0)`, `getDate()` or `toLocaleDateString()` for day logic.
  Date tests run under both `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
- **Shared code lives in packages:** UI → `packages/ui`, helpers → `packages/utils`, types →
  `packages/types`. Frontends call the API through the `*Api` helpers / `authenticatedFetch` in
  `@rentalshop/utils`, never raw `fetch`.
- **i18n:** `locales/{en,vi,ja,ko,zh}/*.json` via next-intl. A new key goes into all 5 locales.
  Error codes need entries in `errors.json` (parity check in `.claude/skills/i18n-keys`;
  `yarn audit:error-translations` points to a missing script).
- **Config:** extend `tsconfig.base.json` / `tsup.config.base.ts`; never commit `.env*`.

## Architecture (where things are)

- `apps/api/app/api/**/route.ts` — ~220 route handlers, grouped by domain (orders, products, calendar, …).
- `apps/api/lib/` — API-only logic (availability, CORS, image search). Tests live next to some files.
- `packages/database/src/*.ts` — one file per model with query functions; `client.ts` is the Prisma singleton.
- `packages/auth/src/server` — auth wrappers and scope helpers. `packages/validation` — zod schemas.
- `packages/ui/src/components` — shared React components used by admin and client.
- `tests/` — standalone jest project (own `package.json`). `scripts/` — DB/ops scripts (many touch prod).
- `docs/` — 70+ guides; start with `DEPLOYMENT_STANDARD.md`, `DATABASE_MIGRATION_WORKFLOW.md`, `ERROR_HANDLING_SYSTEM.md`.
- `.cursorrules` — long legacy rulebook (2k lines). This file wins on conflicts; consult it for detail only.

## Things Claude gets wrong (from hotfix history)

- Mixing `??` with `||` in one expression without parentheses. Next 14 build fails on the API deploy.
- Timezone, five hotfixes so far: using the UTC day instead of the Vietnam civil day for "today",
  calendar taps, availability and income-by-day. A same-day pickup and return still occupies that day.
- Revenue / top-product rankings must exclude `CANCELLED` orders.
- Order and customer search must be scoped to the caller's merchant, and match by word prefix,
  accent-insensitively.
- `OUTLET_STAFF` cannot edit product prices. Hide the control in UI **and** reject it in the API.
- Never edit an applied migration in `prisma/migrations/`. Add a new one.
- Never `new PrismaClient()` in a route. Use the shared `db` singleton (connection-limit incident).
- Mobile parity: a change to an order/availability endpoint usually needs iOS and Android updates too.
