---
name: capture-intent
description: Use before any non-trivial feature, refactor, or unclear request. Writes intent.md, spec.md, and plan.md under .agent/changes/. Use when the user describes an outcome, says "spec", "plan", "intent", or the ask spans more than one file. Do not start coding until these three files exist.
---

# Capture intent, then spec and plan

The playbook's first bottleneck is planning. Capture the ask as files an agent can execute later,
before any branch or code.

## When to skip

A one-line copy or typo fix with no behavior change. Everything else, including bugs, gets at
least `intent.md` (the bug-fix test loop is `bug-fix-tdd` after the issue exists).

## Steps

1. Read `AGENTS.md` sections that match the area (time, roles, orders, mobile).
2. Search `.agent/changes/` and open GitHub issues so you do not open a second change for the same ask.
3. If no issue exists yet, follow `issue-first` and name the folder `<issue>-<slug>`.
   Until the number exists, draft in a temp name and rename after `gh issue create`.
4. Copy `.agent/changes/_template/` to `.agent/changes/<issue>-<slug>/`.
5. Fill `intent.md` from the conversation: problem, verifiable outcome, users and systems, constraints, open questions.
   Leave a question open rather than inventing a product decision.
6. Fill `spec.md` with numbered behaviors a test can fail. Mark out of scope explicitly.
7. Fill `plan.md` with ordered steps, file paths, which domain skill applies, and the verify commands.
8. Stop if an open question changes the API shape, money, permissions, or a migration.
   Ask the human, record the answer in the decision log, then continue.
9. Set status to `accepted` only after the human agrees, or after they already said to implement that outcome.

## Done

The three files are in the change folder, the issue body links the folder, and no code has been
written yet except a failing test the plan calls for.
