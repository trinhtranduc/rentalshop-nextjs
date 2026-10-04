# Mobile orders tab matches its boards

Issue: #401 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The redesigned orders tab (#371, flag `newOrders`) does not match the CHỐT boards `Main`, `VL-tat-ca`, `VL-ban`,
`VL-tim` and `Loc`: it has a centered "My Order" title and three segments, rows are cards with the order number first,
the search has no scan button, the filter sheet is a status grid, and the sale list is a third segment.

## Proposed outcome

- Header: large left title "Đơn thuê" and an outlined "Đơn bán" button that switches to the sale list (board VL-ban,
  whose header has "Đơn thuê" to switch back).
- Search field "Tìm tên, SĐT, mã đơn, tên đồ" with a scan button inside; a scanned code becomes the search.
- Two segments: "Việc cần làm" with a red count badge, "Tất cả đơn".
- Việc cần làm: bands TRỄ HẠN (pink) · HÔM NAY · NGÀY MAI with "giao N · trả M"; flat rows with a Giao/Trả tag,
  customer, items, a date line, pills, total with "còn thu / trả cọc / đã thu đủ", a call button on late rows, chevron.
- Tất cả đơn: inline status chips, a sort selector that opens the Loc sheet, the order count, the same rows with a
  status tag.
- Search results (VL-tim) and the filter / sort sheet (Loc) as on the boards.

## Affected users and systems

All roles on iOS and Android, only with `newOrders` on. No API change.

## Constraints

- No API or server change; what the list API does not return is reported, not invented.
- Money through the shared formatter (#399 drops the currency symbol), icons through the #400 tokens.
- With the flag off the old orders screen is unchanged.
- Keep the stale-answer guard, paging, pull to refresh, the detail router, staff money hiding (iOS) and the 403 fallback.

## Open questions

- None.

## Decision log

- 2026-10-04 — Issue #401 opened as part of #385 (Trinh Tran)
