# Newest attendance events first

Issue: #988 · Author: Codex · Status: implemented · Created: 2026-10-15

## Problem
The person attendance history lists older dates and times first, requiring scrolling to see recent scans.

## Proposed outcome
Show the newest work day first, then the newest event timestamp first within that work day on /attendance/person.

## Affected users and systems
Merchant and outlet-admin users of the client web attendance person page.

## Constraints
Keep Vietnam civil-day grouping, overnight OUT, auto-close and edit grouping, filters and edit controls. Preserve input rows. No API or installed-app change.

## Open questions
None.

## Decision log
- 2026-10-15 — User requested newest times at the top for outlet 2, October 2026, user 1004. Apply consistently to the person history page.
