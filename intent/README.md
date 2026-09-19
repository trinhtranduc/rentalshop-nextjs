# intent/

Version-controlled statements of *what is wanted, why, and under which constraints* (Stage 1 of the
AI-native SDLC). One file per initiative, named `YYYY-MM-DD-<slug>.md`, copied from `TEMPLATE.md`.

Flow: draft with Claude → product owner review → commit → Claude Code plan mode turns it into a plan →
implementation → if a control was breached or a hotfix was needed, the lesson becomes a new intent or a
line in `CLAUDE.md` → "Things Claude gets wrong".

Status values: `draft` → `accepted` → `in-progress` → `done` | `dropped`.
