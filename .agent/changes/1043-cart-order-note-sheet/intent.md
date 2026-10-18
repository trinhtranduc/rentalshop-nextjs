# Cart order note opens the same sheet as the item note

Issue: #1043 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-18

## Problem

Owner: "ở cart view note của order nên có style tương tự note của item tức là dùng sheet view".
In the cart the item note opens the "Ghi chú món" sheet and shows as an icon line under the item (#684, #1024).
The order note is a "Ghi chú | Thêm" value row that opens a full-screen editor (#477, #480). Two notes in one
cart look and behave differently.

## Proposed outcome

- The order note opens the same sheet component as the item note, titled "Ghi chú đơn".
- The cart shows the order note like the item note line: icon + the note on one line, or icon + "Ghi chú đơn".
- Note photos (#480, create only, at most 5) stay, as a small photo row inside the sheet.
- Create and edit-order modes save the note exactly as before.

## Affected users and systems

Every cart user. iOS (`CartV2ViewController`) and Android (`CartV2Screen`). No API, no data change.

## Constraints

- No API change; the create / edit requests are unchanged.
- Keep note photos on create (#480). Edit mode stays text only.
- Reuse the item note sheet; iOS is the reference, Android matches.

## Open questions

- None.

## Decision log

- 2026-10-18 — Keep the #480 photos inside the sheet (a row of small tiles) rather than drop them (agent; the owner asked for #480).
