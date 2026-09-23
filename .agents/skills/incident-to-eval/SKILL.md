---
name: incident-to-eval
description: Use after a hotfix, a production bug, a reverted PR, or the second time an agent makes the same mistake. Writes an eval case and a follow-up intent so the control stays in the repo. Use when the user reports a regression, a bad deploy, or "this broke again".
---

# Incident to eval

The playbook closes the loop by writing a breached control back into the repo. A fix that only
changes code will ship again the next time an agent improvises.

## Steps

1. Open a bug issue first (`issue-first`) if one does not exist. The hotfix branch is
   `hotfix/<issue>-<slug>` off `main`.
2. Reproduce with a failing test (`bug-fix-tdd`) when the behavior can run in Jest.
3. Add `.agent/evals/cases/<area>-<symptom>.md` from `cases/_template.md`:
   failure, detect command, pass condition, link to the test.
4. If the same line already exists in `AGENTS.md` → "Things agents get wrong", tighten the
   detect step. If it does not, add one line in the same PR.
5. When the miss is a product gap (the rule was never specified), add a new change folder
   whose `intent.md` states the control. Do not bury a new product rule only in a code comment.
6. Note the case path in the PR test plan.
7. After merge, the case stays `active` until a later issue retires it.

## Do not

- Delete or weaken the failing test so the hotfix goes green.
- Rewrite history on `main` to hide the incident.
- Store customer data or secrets inside the eval case.
