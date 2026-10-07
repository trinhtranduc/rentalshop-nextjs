# Intent — Timezone batch B: day-based reports and exports in Vietnam days

Issue: #594 (sub-issue of #578) · Author: Trinh (via Claude) · Status: in progress · Created: 2026-10-07

## Problem

Reports, exports and "today" numbers build day bounds from the UTC day or the server's zone. Railway runs in
UTC, so orders made 00:00–06:59 Vietnam time land on the previous day; exports print UTC times; list and
aggregate of the same screen use different bounds; "overdue" has three meanings. Audit IDs: PKG-1, PKG-2,
API-3…API-10, API-12…API-16, ADM-2, ADM-3, ADM-8, WEB-1 (`.agent/changes/578-timezone-audit-fixes/audit.md`).

## Proposed outcome

Spec §B of #578: every day-based report/export reads Vietnam civil days with exact bounds, list = aggregate,
one overdue rule (PICKUPED and returnPlanAt before the start of VN today), Excel cells in VN time.

## Constraints

Same as #578: request/response shapes unchanged, no schema/data change, every input old apps send keeps its
meaning (YYYY-MM-DD keys, ISO instants, old iOS `T00:00Z…T23:59:59.999Z`, old Android `T23:59:59Z`).
Not in this batch: availability (A), admin UI (C), shop web (D), billing/email/loyalty (E), mobile (F).

## Decision log

- 2026-10-07 — Owner: proceed in parallel with the other batches (Trinh)
- 2026-10-07 — An instant at `23:59:59[.fff]Z` keeps its written date (old UTC-day window end); any other
  instant is the VN day that contains it; a `YYYY-MM-DD` key is that VN day (Claude)
