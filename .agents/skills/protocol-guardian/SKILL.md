---
name: protocol-guardian
description: Use before any destructive command, secret access, migration edit, force push, production deploy, or test edit during a bug fix. Enforces the approval gate in .claude/hooks/production-gate.sh. Use whenever a command or file touches prod, .env, prisma/migrations, or tests while FIX_MODE=1.
---

# Protocol guardian

Governance runs while the agent acts, not after the PR. The hook is the enforcement;
this skill is the judgment before you invoke a tool.

Hook: `.claude/hooks/production-gate.sh` (wired in `.claude/settings.json`). Exit 2 blocks the call.

## Always blocked

- `prisma migrate reset`, `prisma migrate deploy`, `db:reset-railway`, `*:prod`
- `railway … --environment production`, `vercel … --prod`
- Android `bundleRelease`, iOS fastlane release/deliver/pilot/supply
- `git push` to `main` or `main-real`, and any force push
- Reading or editing `.env*`, `keystore.properties`, `*.p8`
- Editing an applied folder under `prisma/migrations/`

A human go is one prefix on that single command: `RELEASE_APPROVED=1`. Do not export it for the
session. New unapplied migrations are created with `yarn db:migrate:dev`, not by hand-editing
`migration.sql`. `MIGRATION_EDIT_OK=1` is only for a migration that has never been applied.

## Fix mode

After the failing test is committed (`bug-fix-tdd`), the rest of the session runs with `FIX_MODE=1`.
The hook then rejects edits under `tests/`, `*.test.*`, `*Tests.swift`, and `*Test.kt`.
Change the implementation. If the test was wrong, leave fix mode, say why, and write a new test
in a new commit. Do not silent-edit the proof.

## Process gates (no hook, still mandatory)

- No PR without `Fixes #<issue>` (`issue-first`).
- No feature code without the change folder.
- No new `PrismaClient` in a route.
- No CUID in an API response.
- No role filter that exists only in the UI.

## When the hook blocks you

Read the stderr line. Explain the block to the human in one sentence and ask for a go or a
safer command. Do not retry with a reworded command that dodges the regex.
