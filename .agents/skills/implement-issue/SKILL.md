---
name: implement-issue
description: Use when writing code for an existing GitHub issue. Reads .agent/changes/<issue>-<slug> and the domain skills, and refuses scope that is not in the plan. Use when the user says implement, code, fix the issue, or continue a change folder.
---

# Implement from the issue

Code starts after the issue and the change folder exist (`issue-first`, `capture-intent`).

## Steps

1. Read the issue (`gh issue view <number>`) and `.agent/changes/<number>-<slug>/{intent,spec,plan}.md`.
   If any file is missing, write it before editing product code.
2. Set status to `in-progress` on the three files.
3. Read every domain skill named in `plan.md`. Defaults when the plan is silent:
   - route handler → `api-route-standard`
   - date or day → `timezone-dates`
   - `schema.prisma` → `db-migration`
   - user-facing string or error code → `i18n-keys`
   - API shape, orders, availability, permissions → `mobile-parity`
   - bug → `bug-fix-tdd` (failing test committed first, then `FIX_MODE=1`)
4. Implement only the steps in `plan.md`. When the code wants a neighboring fix, add it to the
   decision log and stop, or put it in a new issue. Do not expand the diff.
5. Keep dual IDs, merchant/outlet scope, and the order status machine as in `AGENTS.md`.
6. Run `verify-change` before the commit that claims the work is done.
7. Commit with `type(scope): subject` and the issue number in the body (`Refs #<number>`).
   Do not push or open a PR unless the user asked. When they do, follow `issue-first` step 7
   and `review-pr`.

## Stop conditions

- The spec's open questions are still open and they affect money, permissions, migrations, or mobile payloads.
- A command would need `RELEASE_APPROVED=1` (`protocol-guardian`).
- The failing test would have to be weakened to pass.
