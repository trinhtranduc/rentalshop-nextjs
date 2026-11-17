# Branch in order detail and AI button top right (apps)

Issue: #1618 · Author: agent · Status: in-progress · Created: 2026-11-17

## Problem

- Order detail on iOS and Android does not say which branch the order belongs to. An owner with two or more branches who opens an order from the calendar, search or a customer cannot tell. The web shows it (`OrderInformation.tsx:122`).
- The "✦ Tóm tắt tuần" button floats bottom right on Tổng quan and covers the last card. The owner wants it top right, like the web.

## Proposed outcome

- iOS and Android order detail: a line with a store icon and the order's branch name in the status box, above "Tạo bởi …", for an owner (MERCHANT) with 2+ active branches.
- iOS and Android Tổng quan: the AI button sits at the end of the "Tổng quan" title row, compact, scrolls with the page.

## Affected users and systems

MERCHANT with 2+ branches; iOS, Android. No API, web or DB change.

## Constraints

Keep names and structure; no unrelated changes. iOS is the reference. Ships with the next store build.

## Open questions

- None blocking. Assumption: one-branch shops and branch roles do not see the branch line (they only have one branch).

## Decision log

- 2026-11-17 — owner: "button AI tóm tắt nên để góc phải top-right" (owner)
- 2026-11-17 — owner: "icon ai summary nên có animation chút" → the ✦ twinkles (owner)
- 2026-11-17 — owner asked for the branch field in order detail on web and mobile; web already has it, so apps only (agent)
