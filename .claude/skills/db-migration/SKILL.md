---
name: db-migration
description: Use whenever prisma/schema.prisma changes or a migration must be created, applied, verified or repaired (failed migration on Railway). Covers the local → dev → production flow and the resolve procedure.
---

# Prisma migration flow (local → dev → production)

Applied migrations are immutable. Dev and production databases live on Railway and migrate
automatically from `apps/api/start.sh` on deploy. Full write-ups: `docs/DATABASE_MIGRATION_WORKFLOW.md`,
`docs/RESOLVE_FAILED_MIGRATION.md`.

1. **Edit the schema** in `prisma/schema.prisma`. Keep the dual-ID pattern: `id String @id @default(cuid())`
   plus `publicId Int @unique`. Add indexes for every field used in `where`/`orderBy` by list endpoints.
   Store instants as `DateTime` (UTC); avoid `@db.Date` (see `timezone-dates`).
2. **Create the migration locally** with a descriptive name:
   `yarn db:migrate:dev --name <snake_case_change>` → `prisma/migrations/<timestamp>_<name>/migration.sql`.
   Read the generated SQL. A new `NOT NULL` column on a populated table needs a default or a two-step
   migration (add nullable → backfill → set not null).
3. **Regenerate and type-check:** `yarn db:generate && yarn type-check`. Update the model helper in
   `packages/database/src/<model>.ts` and any zod schema in `packages/validation`.
4. **Verify locally:** `yarn db:migrate:status` prints "Database schema is up to date". Run the related
   jest tests in `tests/`.
5. **Commit schema and migration folder together** (`feat(db): …`). Never hand-edit an existing
   `migration.sql`. If one is wrong and not yet deployed anywhere, delete the folder and regenerate. The
   `production-gate.sh` hook blocks edits under `prisma/migrations/` unless `MIGRATION_EDIT_OK=1`.
6. **Deploy to dev first:** merge to `dev`; the Railway dev API service runs `prisma migrate deploy` at
   start. Check its logs and hit `https://dev-api.anyrent.shop/api/health`.
7. **Production is a human decision:** PR to `main`, a human merges. Any manual production migration
   command is blocked by the hook until the human says go and `RELEASE_APPROVED=1` is set for that command.
8. **Failed migration on Railway:** identify with `prisma migrate status`, then in the Railway shell mark it
   `--applied <name>` (SQL actually ran) or `--rolled-back <name>` (it did not) with `prisma migrate resolve`,
   then redeploy. Never delete rows from `_prisma_migrations` by hand.
9. **Data scripts** in `scripts/` that touch prod (`*:prod`, `db:fix-sequences:prod`) follow the same gate.
10. **Mobile:** if a column feeds an API response, apply the `mobile-parity` skill.
