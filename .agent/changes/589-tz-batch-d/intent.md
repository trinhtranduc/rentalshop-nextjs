# Intent — Timezone batch D: shop web (#589, part of #578)

Issue: #589 (sub-issue of #578) and #579 · Author: Trinh (via Claude) · Status: in progress · Created: 2026-10-07

## Problem

Audit findings WEB-2, WEB-3 and WEB-4 (`.agent/changes/578-timezone-audit-fixes/audit.md`) and bug #579:
"today" stays frozen at page load, Sửa đơn drops the clock time of pickup and return, the renewal bar counts
24-hour blocks, and `/availability?productId=` loses the product on about half the loads.

## Proposed outcome

Spec §D of #578 (D1–D3) plus the #579 deep link. Web only. No API change and no response change.

## Constraints

Edit only `apps/client/**`, `locales/{en,vi}`, `tests/**` and this folder. Vietnam stays the shop zone.
Failing tests first (`bug-fix-tdd`), then `FIX_MODE=1`.
