# Hide the call button on late rows of "Việc cần làm"

Issue: #468 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

In the new mobile Orders tab, "Việc cần làm" (today work list) shows a phone button on late ("TRỄ HẠN") rows.
The owner wants the rows clean. The updated board "Việc cần làm" (Main) has no call button on any row.

## Proposed outcome

No call button on any "Việc cần làm" row, late or not, on iOS and Android. The row has no empty gap where the
button was. Calling the customer stays on the order detail screen.

## Affected users and systems

All shop roles using the mobile Orders tab. iOS and Android only. No API or data change.

## Constraints

- Order detail keeps its call action.
- Other rows (rent list, sale list, search, overview drill-downs) never had the button; unchanged.

## Open questions

- None.

## Decision log

- 2026-10-05 — Hide the call button on late rows; call from order detail (owner, board Main updated).
- 2026-10-05 — Keep the row able to show a phone (one decision function returns none) so the rule is unit-tested on
  both platforms (agent).
