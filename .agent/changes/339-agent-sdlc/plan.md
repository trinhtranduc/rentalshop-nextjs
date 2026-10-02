# Plan — Shared agent SDLC workflow

Issue: #339 · Status: in-progress · Spec: ./spec.md

## Steps

1. Add AGENTS.md, slim CLAUDE.md, skills, .agent templates, and GitHub issue/PR files.
2. Open issue #339 before the branch.
3. Commit only those files on a branch from origin/dev.
4. Open the PR against dev with Fixes #339.

## Files

- AGENTS.md, CLAUDE.md — shared rules and Claude adapter
- .agents/skills/ — SDLC procedures
- .agent/ — change and eval templates, plus this folder
- .github/ — issue templates, PR template, CODEOWNERS, quality and governance workflows

## Risks

quality.yml runs yarn type-check on every PR. It can fail on existing type errors that are not part of this change.

## Rollback

Revert the PR. Product code is untouched.
