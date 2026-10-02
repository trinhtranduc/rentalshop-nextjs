# Outlet operations panel on the web dashboard

Issue: #350 · Author: Trinh Tran · Status: accepted · Created: 2026-10-02

## Problem

The dashboard summarises numbers but does not tell an outlet team what to do today (handovers, returns,
overdue, no-shows) or how much deposit money is held.

## Proposed outcome

"Việc hôm nay" panel for every dashboard user and a "Tiền trong ca" card for managers, both for the current
Vietnam civil day, backed by `GET /api/analytics/outlet-operations`.

## Affected users and systems

`OUTLET_ADMIN`, `OUTLET_STAFF` (own outlet), `MERCHANT` (all or selected outlets), `ADMIN`. Apps: api, client.

## Constraints

Vietnam civil day; SQL filtering; staff never get money fields; no schema change; mobile later.

## Decision log

- 2026-10-02 — Phase 1 = today's work + deposits; staff see the work lists, not money; mobile later (Trinh Tran, "update giúp tôi" on the proposal)
- 2026-10-02 — Takings by payment method dropped from phase 1: order payments are not stored with a method (agent)
- 2026-10-02 — Rows link to the order and to `tel:`; status actions stay on the order page in phase 1 (agent)
- 2026-10-02 — Built on top of `fix/349-web-ui-quick-fixes` for a combined localhost preview (agent)
