# .agent/ — SDLC data for this repo

Versioned planning and eval artifacts. Procedures that tell an agent *how* to work live in
`.agents/skills/` and `AGENTS.md`. This folder is *what* we decided for a specific change.

```
.agent/
  changes/<issue>-<slug>/
    intent.md    # what is wanted, why, constraints
    spec.md      # behavior that can be verified
    plan.md      # ordered steps, files, risks
  evals/cases/   # one file per regression that must stay caught
```

## Naming

`<issue>` is the GitHub issue number. `<slug>` is short, lowercase, hyphenated.
Example: `.agent/changes/482-overview-revenue-split/`.

Copy `.agent/changes/_template/` when the issue exists. Do not invent an issue number.

Status in each file header: `draft` → `accepted` → `in-progress` → `done` | `dropped`.

## Loop

1. `capture-intent` writes the three files from `_template/`.
2. `issue-first` opens the GitHub issue and puts the number in the folder name.
3. `implement-issue` codes only against `plan.md`.
4. `verify-change` runs lint, type-check, and tests.
5. The PR body links `Fixes #<issue>` and this folder.
6. A production miss becomes a new file in `evals/cases/` (`incident-to-eval`).

Older drafts in `intent/` stay where they are. New work does not go there.
