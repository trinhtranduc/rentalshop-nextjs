# Spec — Shared agent SDLC workflow

Issue: #339 · Status: in-progress · Intent: ./intent.md

## Behavior

1. AGENTS.md states the issue-before-PR loop, commands, and known agent mistakes.
2. CLAUDE.md tells Claude to read AGENTS.md and keeps the production hook.
3. .agents/skills/ contains capture-intent, issue-first, implement-issue, protocol-guardian, verify-change, review-pr, and incident-to-eval.
4. .github/workflows/pr-governance.yml fails a PR whose body does not link an issue.
5. .github/workflows/quality.yml type-checks and requires intent.md, spec.md, and plan.md when a numbered change folder is in the diff.
6. Issue forms exist for bug, feature, and agent task. Blank issues are disabled.

## Out of scope

Product features, online orders, printers, calendar, and enabling branch protection in the GitHub UI.

## API and data

None.

## Acceptance

- [ ] PR body contains Fixes #339
- [ ] Diff does not include unrelated product files
- [ ] pr-governance.yml and quality.yml parse as YAML
