# Stale business e2e expectations + admin backfill confirm count

Issue: #1029 · Author: agent (owner approved) · Status: approved · Created: 2026-10-17

## Problem

- Business e2e: 833/846 per TZ. All 13 failures are tests that still expect old, intentionally changed behaviour.
  BF-ATT-X03 expects `ATTENDANCE_NOT_CONFIGURED` for a punch at an outlet without a location (now
  `ATTENDANCE_LOCATION_NOT_SET`, #1014). X03 aborts before setting the location, so X06–X10, X12, X14 fail.
  BF-SUB-34..38 expect the English plan-limit sentence; it is now localized, Vietnamese by default (#986).
- Admin Settings › Admin Info, image-search backfill (#1017): the confirm asks "Queue N products?" with N =
  missing embeddings, including products that already have a PENDING/RUNNING job. A second run says
  "Queue 10?" and then "Queued 0, already waiting 10".

## Proposed outcome

- The two e2e files assert today's behaviour without dropping any assertion; business e2e green in both TZ.
- The confirm count is what POST would queue now (dry run with the same `includeFailed`). 0 says nothing to queue.

## Affected users and systems

ADMIN only (admin app). Tests. No API, no mobile.

## Constraints

No API change. Code + HTTP status checks in the tests stay exact.

## Decision log

- 2026-10-17 — reuse the existing `dryRun` POST for the confirm count instead of a new GET field (agent; keeps the API untouched)
