# In use chips include Trial plan so they add up

Issue: #1196 · Author: owner · Status: in-progress · Created: 2026-10-25

## Problem

In use 72, Basic 34, Pro 15, Enterprise 0 (49 ≠ 72). Signup uses plan name **Trial**. Those still in the trial window are In use but not on the chips. `plan=Basic` is exact equals, so `Basic — 6 months` is missed. Owner: 72 vs 34+15 is wrong.

## Proposed outcome

- In use chips: Trial + Basic + Pro + Enterprise among còn hạn. Trial chip → `/merchants?status=current&plan=Trial`.
- `plan=Basic` matches names containing `basic`.
- Trial **tile** stays every `status=TRIAL` row (including hết hạn).

## Affected users and systems

ADMIN/OPS, admin dashboard, GET `/api/merchants` `plan=Basic` matcher. POS does not call this search.

## Constraints

Admin English. Dual IDs. `main-real`.

## Open questions

None.

## Decision log

- 2026-10-25 — Owner: 72 vs Basic 34 / Pro 15 does not add up.
