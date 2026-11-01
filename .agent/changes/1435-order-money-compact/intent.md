# Order detail: one compact money block

Issue: #1435 · Author: Claude for Trinh Tran · Status: accepted · Created: 2026-11-01

## Problem

The order detail spreads the money over three places: "Tạm tính" under MÓN, THANH TOÁN, and a separate stage card. A rental
with stages and money collateral scrolls 322 pt more than it needs, the hand-over money takes three lines, and the block
uses 6 font sizes and 2 blues for "Sửa".

## Proposed outcome

The mockup the owner approved ("chốt mockup"), tab "★ Thanh toán ở chi tiết đơn" (key `odmoney`) of
https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4, is on iOS (the reference) and Android, in all 9 cases of the tab.
Checked by unit tests of which lines show in each case and by screenshots of each case on each app.

## Affected users and systems

Every role that opens a rental's detail. iOS and Android. No API, web or database change.

## Constraints

- Presentation only. Every number stays computed by the same rule (`ShareMoneyRule.collectOnDelivery/cashAtHandover`,
  `OrderDetailLogic`). No change to a money rule, the hand-over rule or the collect flow.
- Share image and printed receipts do not change: `OrderShareRenderer.swift`, `PrinterManager.swift`,
  `OrderShareRenderer.kt`, `DepositReceipt.kt`.
- No API path changes, so no `.agent/api-changes/LOG.md` row. `mobile-parity` is met: both apps change in this PR.
- Accessibility identifiers and test tags stay; the UI tests that use them still pass. Paid and unpaid are not told by colour alone.
- Android `MoneyRow` is shared with `OrderDetailV2Sheets.kt`: the new block has its own function, the sheets do not change.
- Another PR (#1433) renames "Phí hư hỏng" to "Phụ phí": the existing key is used so the label follows it.
- Not touched: "Ảnh khi giao" row, status warning, note colours, sheet titles.

## Open questions

- Follow-up for the owner, not blocking: on a rented order iOS has "Đã cọc"; Android has "Trả lại thế chân",
  "Đã thanh toán trước", red fees and a "Khi nhận trả: thu thêm 0" line. Each app keeps its lines in this PR (mockup, question 4).
- Sales are not in the tab. They stay exactly as they are.

## Decision log

- 2026-11-01 — Owner approved the new version. Both "Thu giai đoạn N" buttons stay; share image and receipts stay; "Tạm tính" stays
  even with no discount; the last stage merges into the amount due; "Còn phải thu" hides only when it equals the amount due (owner).
- 2026-11-01 — Android's zero "Khi nhận trả: thu thêm 0" stays as a line but plain, because a finished order has no large figure (agent, listed in the PR).
