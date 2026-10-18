# Cart: one pencil for every edit

Issue: #1061 · Author: Trinh Tran (agent) · Status: approved · Created: 2026-10-18

## Problem

Owner: "đổi icon edit không giống". The cart's TIỀN rows (Giảm giá, Đặt cọc, Ghi chú đơn) end in a blue `pencil`,
but each item's note line starts with a grey `square.and.pencil` (iOS) / grey `Edit` (Android). `CartV2Icon` still
names `note.text` / `Description` for the order note. The cart shows two different "edit" icons.

## Proposed outcome

Every tap-to-edit spot in the cart shows the same plain pencil (iOS `pencil`, Android `Icons.Outlined.Edit`), blue,
same size and weight, after the text. The item note line: blue "Ghi chú" + pencil when empty, the wrapped note + pencil
when filled.

## Affected users and systems

All cart users; iOS and Android. No API, no data.

## Constraints

No behaviour change, accessibility labels unchanged. "Thêm" (`plus.circle`) and the order-note camera + count stay.

## Decision log

- 2026-10-18 — one pencil, at the end of each row, matching the #1056 TIỀN rows (owner)
- 2026-10-18 — the pencil is the mockup's pen-line (pencil + underline), drawn from its paths on both apps (owner: "icon đúng mockup")
