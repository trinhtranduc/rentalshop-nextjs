---
name: issue-first
description: Use before creating a branch, a commit series, or a pull request. Opens a GitHub issue first and blocks PRs that do not reference one. Use when the user says "fix", "implement", "open a PR", "ship", or starts a feature. Required for every behavior change.
---

# Issue before branch, branch before PR

A pull request without an issue has no acceptance check and does not close the loop.
`.github/workflows/pr-governance.yml` fails the PR when the body does not link an issue.

## Steps

1. Search existing issues: `gh issue list --repo trinhtranduc/rentalshop-nextjs --state open --limit 30`
   and `gh search issues "<keywords>" --repo trinhtranduc/rentalshop-nextjs`.
   Reuse an open issue when it is the same change.
2. Pick a template:
   - bug or regression → `.github/ISSUE_TEMPLATE/bug.yml`
   - new behavior → `.github/ISSUE_TEMPLATE/feature.yml`
   - work handed to an agent with acceptance already known → `.github/ISSUE_TEMPLATE/agent-task.yml`
3. Create it with `gh issue create`. Title matches the template prefix (`bug:`, `feat:`, `agent:`).
   Body includes problem, outcome, affected apps, and constraints. Do not start coding in the issue body.
4. Create or rename `.agent/changes/<number>-<slug>/` and write `intent.md`, `spec.md`, `plan.md`
   (`capture-intent`). Put the folder path in an issue comment.
5. Branch from the current base (`main` for a hotfix, `dev` for feature work unless the human said otherwise):
   - `fix/<number>-<slug>`
   - `feat/<number>-<slug>`
   - `hotfix/<number>-<slug>` off `main`
6. Only then implement (`implement-issue`).
7. The PR title is conventional (`fix(scope): …`). The body uses `.github/PULL_REQUEST_TEMPLATE.md`
   and contains `Fixes #<number>` so GitHub closes the issue. `Closes` and `Resolves` are accepted
   by the workflow; prefer `Fixes`.

## Do not

- Open a PR from a dirty tree that mixes this issue with unrelated files.
- Use `[no-issue]` to skip the check. There is no bypass label.
- File an issue after the PR exists, except to repair a PR that the workflow already rejected.
