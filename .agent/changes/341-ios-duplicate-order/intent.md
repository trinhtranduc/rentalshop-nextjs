# iOS create order duplicates

Issue: #341 · Author: agent · Status: in-progress · Created: 2026-09-26

## Problem

One Save/Confirm on the iOS POS preview screen sometimes creates two identical orders.

## Proposed outcome

One confirm creates one order. A second concurrent create with the same composition returns the existing order instead of inserting another row.

## Affected users and systems

Outlet staff on iOS. API `POST /api/orders`. Android and web create must keep working.

## Constraints

Do not add a migration unless required. Keep numeric public ids. Do not weaken auth or stock updates.

## Open questions

None.

## Decision log

- 2026-09-26 — Fix iOS re-entry guard and make API duplicate check atomic with advisory lock.
