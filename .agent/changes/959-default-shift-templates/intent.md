# Four ready-made shift templates per branch

Issue: #959 · Author: Trinh Tran · Status: approved · Created: 2026-10-13 · Refs #906

## Problem

A shop that turns on Chấm công must create every shift template by hand before it can assign shifts.

## Proposed outcome

Each branch starts with four templates the shop can edit, hide or delete like its own:
Ca sáng 08:00–12:00 (blue), Ca chiều 13:00–17:00 (orange), Ca tối 18:00–22:00 (purple),
Hành chính 08:00–17:00 with a 60-minute break (green).

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN` (the roles that read templates). `api`, `packages/database`, one additive
migration. Web Mẫu ca and Xếp ca read the same route and show the templates with no change.

## Constraints

- Created once per branch: deleting them all never brings them back.
- A branch that already has templates gets none.
- Two parallel first loads create exactly four.
- Additive only; installed apps have no attendance code; response shape unchanged.

## Open questions

- None.

## Decision log

- 2026-10-13 — owner approved the four templates and Vietnamese names (issue #959).
