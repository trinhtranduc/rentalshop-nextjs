---
name: review-pr
description: Use before opening a pull request and when reviewing one. Checks the linked issue, the change folder, verification output, and a human gate for auth, payments, migrations, and production. Use when the user says review, PR, pull request, or ship.
---

# Review the pull request

Agent review is the first layer. A human still owns auth, payments, migrations, and production deploys.

## Before `gh pr create`

1. Confirm `issue-first`: the body contains `Fixes #<number>`, and `<number>` matches
   `.agent/changes/<number>-<slug>/`.
2. Confirm `verify-change` output is in the test plan.
3. Diff against the base. Drop files that are not in `plan.md`.
4. Fill `.github/PULL_REQUEST_TEMPLATE.md`. Do not leave the HTML comments as the only text.
5. Create the PR against `main` unless the human named another base. `gh pr create` only when
   the user asked for a PR. Push with `-u` when the branch has no upstream.

## Review checklist

- Issue acceptance matches the diff. No drive-by refactors.
- API routes follow `api-route-standard`. Scope is in the query, not the client.
- Dates use Vietnam civil days. Revenue queries exclude `CANCELLED`.
- No CUID leaks, no new `PrismaClient`, no edited applied migration.
- New strings exist in `en`, `vi`, `ja`, `ko`, `zh`.
- iOS and Android updated together when the contract changed.
- `??` mixed with `||` is parenthesized.
- Secrets and `.env*` are absent from the diff.

## Human review required

Request a human (CODEOWNERS: `@trinhtranduc`) and do not merge when the diff touches:

- `packages/auth/`, payment or subscription routes
- `prisma/migrations/` or `prisma/schema.prisma`
- `.github/workflows/`, `AGENTS.md` governance, or the production hook
- anything that needs `RELEASE_APPROVED=1` to deploy

Agent review can approve a UI or copy change that passed `verify-change`. It does not merge
to `main`.
