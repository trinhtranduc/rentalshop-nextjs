# Attendance location setup status

Issue: #989 · Author: Codex · Status: implemented · Created: 2026-10-15

## Problem
The list shows an existing QR even when the outlet has no coordinates, so the owner cannot see why mobile clock-in is blocked until opening outlet details.

## Proposed outcome
Show a location status badge beside the existing QR status in Chấm công → Mã QR & vị trí.

## Affected users and systems
Merchant and outlet admin on the client web location list.

## Constraints
Existing Pill style; all five locale translations; unknown fetch results must not be treated as missing location. No API or mobile contract change.

## Open questions
None.

## Decision log
- 2026-10-15 — User explicitly requested a badge or status when the outlet has no location. Use a warning missing badge and a positive configured badge in a separate location column.
