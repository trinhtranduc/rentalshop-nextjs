# Intent — #967 loyalty as a feature add-on

**What:** sell Khách thân thiết (loyalty) as a feature add-on, the same row type and flow as Chấm công (#943).

**Why:** owner (2026-10-14): a shop whose plan has no loyalty cannot buy it today. Loyalty only follows the plan
(`packages/loyalty/src/plan-gate.ts` → plan `features`).

**Constraints:** payments (human review); reuse the #943 flow (no new purchase code); shops that have loyalty through
their plan keep it and pay nothing more; loyalty data is kept when the add-on ends; additive only (no migration needed,
`merchant.modules` gains a value, old fields keep their meaning); one shared check for every loyalty gate; Vietnam days.
