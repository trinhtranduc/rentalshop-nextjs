# Gỡ giá theo khối giờ (#1621) khỏi dev

Issue: #1635 · Author: agent (owner asked) · Status: accepted · Created: 2026-11-23

## Problem

Owner, 2026-11-23: "tôi muốn remove feature block giờ". Hour-block pricing ("Theo khối giờ", #1621) is on `dev`
through PR #1622 (merge `8d397b380`, API + web). The iOS (#1624) and Android (#1626) PRs are not merged. `main-real`
never had it.

## Proposed outcome

`dev` is back to its state without #1622: no `HOURLY` / `unit HOUR` block options, no `hour-blocks` capability, no
"Theo khối giờ" on the web. Everything merged after #1622 stays. The #1621 change folder and its LOG row stay as
history; a new LOG row records the removal.

## Constraints

- A plain revert of the merge (`git revert -m 1 8d397b380`); no migration was added, none is removed.
- PRs #1624 / #1626 and issues #1623 / #1625 are closed; the branches stay.
- Hour-block options saved on the dev database while testing (if any) are not deleted by this change.

## Spec (checks)

1. No source file under `apps/`, `packages/`, `tests/` refers to hour blocks (`hour-blocks`, `hourBlock`, `HourBlocks`).
2. `locales-valid-json`, the block-pricing, receipt, create-order, cart and reorder tests, and the API type-check pass.
3. `.agent/api-changes/LOG.md` keeps the #1621 row and has a #1635 row.
