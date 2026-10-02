# Evals

A case in `cases/` is a regression we already shipped once and must not ship again.
`verify-change` reads the cases that touch the files in the diff. `incident-to-eval` adds a case
after a hotfix or the second time an agent makes the same mistake.

A case is not a substitute for a Jest test. If the behavior can be executed, the case points at
the test file. The markdown records the control: what failed, how to detect it, what "pass" is.

## Case shape

See `cases/_template.md`. One case per file, named `<area>-<symptom>.md`.

Seeded from hotfix history:

- `cases/vn-civil-day.md` — UTC day used instead of the Vietnam civil day
