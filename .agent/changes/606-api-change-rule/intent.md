# Intent — #606 Every API change is reviewed at issue time and tracked

Issue: #606 · Author: Trinh (via Claude) · Status: accepted · Created: 2026-10-07

## Problem
API changes were reviewed for installed apps only at PR time, if at all, and nothing recorded which change
reached production with which verdict. #605 nearly redefined `futureIncome`, which old Android adds to revenue.

## Proposed outcome
Owner rule: "khi thay đổi bất cứ api cần đánh giá tác động của nó và cần tracking lại". Review at issue time and
PR time; one row per change in `.agent/api-changes/LOG.md` with status planned → dev → main-real; CI fails a PR
touching API paths without the table and the row; release-review blocks a release with an untracked change.

## Constraints
Docs, templates and CI only; no app code. The CI check must not fire on PRs that do not touch API paths.

## Decision log
- 2026-10-07 — Rule requested by the owner (Trinh)
