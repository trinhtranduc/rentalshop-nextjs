# Web UI quick fixes from the local audit

Issue: #349 · Author: Trinh Tran · Status: accepted · Created: 2026-10-02

## Problem

See #349: calendar totals stuck at 0, a stray `0` on order detail, missing vi messages, hard-coded English in
pagination, the Users page, and order notes.

## Proposed outcome

Calendar cards equal the sum of the month's per-day counts. No stray `0`. Those strings render in vi/en.

## Constraints

UI only. No API change. Shared pagination is also used by admin.

## Decision log

- 2026-10-02 — Fix and run on localhost for a preview before opening a PR (Trinh Tran)
- 2026-10-02 — Calendar cards read the per-day counts the grid already loads, no extra request (agent)
