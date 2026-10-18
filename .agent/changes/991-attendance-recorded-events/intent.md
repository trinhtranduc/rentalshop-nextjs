# Recorded attendance events only on person history

Issue: #991 · Author: Codex · Status: implemented · Created: 2026-10-15

## Problem
Failed QR/GPS/setup scans clutter the person attendance history and make technical/configuration problems look like employee attendance failures.

## Proposed outcome
Hide failed scan attempts in the web person list; preserve accepted events, edits and auto-closed records. Keep the internal scan audit, raw month data, edits and totals intact. Update and rerun headed E2E.

## Affected users and systems
Merchant and outlet-admin users of /attendance/person; web display model and E2E.

## Constraints
No API, schema, data deletion or mobile change. Keep newest-first order, accepted suspicious events and correct edit targeting using unfiltered raw rows.

## Open questions
None. The user clarified the concern is failed scans such as wrong-outlet QR and missing location setup; keep edits and missing-out records.

## Decision log
- 2026-10-15 — User clarified that scan errors should be omitted from the attendance list; preserve EDIT/AUTO_CLOSED history. Do not delete audit data. Remove rejected filter; keep suspected filter for successful scans with suspect reasons.
