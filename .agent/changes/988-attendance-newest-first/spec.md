# Spec — Newest attendance events first

Issue: #988 · Status: implemented · Intent: ./intent.md

## Behavior
1. Work-day groups sort descending by Vietnam day key.
2. Rows within each group sort descending by actual event timestamp; equal timestamps keep input order.
3. Overnight OUT, auto-close and EDIT rows retain their existing work-day group.
4. Sorting copies the row array, leaving source data and other consumers unchanged.

## Out of scope
API sorting, exports, mobile apps, permissions, new text, database changes.

## API and data
No API change. Only the web presentation model changes; identifiers and response meanings stay unchanged.

## Acceptance
Existing model tests cover work-day grouping and descending order in UTC and Asia/Ho_Chi_Minh. Verify the rendered order and filter behavior with a visible browser fixture.
