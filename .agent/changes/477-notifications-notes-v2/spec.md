# Spec — Notifications and order note editor in the new design

Issue: #477 · Status: accepted · Intent: ./intent.md

## Notifications (flag `newProducts` on)

1. Header: ‹ back, title "Thông báo" 20pt bold, "Đã đọc hết" (blue, check icon; disabled when unread = 0),
   ⋯ menu with "Xóa đã đọc" (confirm, then `DELETE` read). Same calls as the old screen.
2. Chips "Tất cả" (selected = dark fill, white text) and "Chưa đọc · N" (N = server `unreadCount`).
   "Chưa đọc" reloads page 1 with `isRead=false`; paging works the same in both modes.
3. Rows are grouped by the Vietnam civil day of `createdAt` (`Asia/Ho_Chi_Minh`), newest first:
   today → "HÔM NAY · T2 05/10", yesterday → "HÔM QUA · CN 04/10", older → "T6 02/10" (upper case).
   `2026-10-04T16:59:59Z` belongs to 04/10, `2026-10-04T17:00:00Z` to 05/10.
4. Row: 40pt tile (12 radius) coloured by kind (table below), title 16pt, body 15pt #475569 max 2 lines,
   time "HH:mm" (Vietnam time) 14pt #64748B right-aligned.
5. Unread: title bold #0F172A, 9pt blue dot, row #F8FBFF. Read: title medium #334155, no dot, white row.
6. Tap: if unread, mark read (optimistic, as today) and open the order when the notification has one.
7. Empty state: bell tile + "Chưa có thông báo" (all) or "Không có thông báo chưa đọc" (unread filter).
8. Pull to refresh, swipe actions (iOS) / long-press delete (Android) unchanged.
9. Flag off: the old screen, unchanged.

| Kind | When | Icon | Colours (text / fill) |
|---|---|---|---|
| order | `ORDER_CREATED`, other status changes | receipt | #1E40AF / #DBEAFE |
| handOver | status PICKUPED; type has HANDOVER / PICKUP_DUE | truck | #1E40AF / #DBEAFE |
| late | type has OVERDUE / LATE | clock | #B91C1C / #FEE2E2 |
| returned | status RETURNED | return arrow | #5B21B6 / #EDE9FE |
| payment | status COMPLETED; type has PAYMENT | money | #047857 / #D1FAE5 |
| neutral | status CANCELLED, unknown type | bell | #475569 / #F1F5F9 |

## Note editor

10. Full screen. Header: X (discard, no save) + "Ghi chú" 20pt bold + " #0057" 15pt medium #475569
    (short code = last part of the order number). Cart: "Ghi chú" only.
11. "Nội dung" 15pt semibold over a 140pt text area: 16pt text, 12 radius, 1.5pt #CBD5E1 border; focused
    1.5pt #1D4ED8 border + 3pt #DBEAFE ring. No counter (no limit exists).
12. "Ảnh" + "N/5 ảnh"; 72pt tiles (12 radius) with a 24pt dark × badge at the top-right; a dashed "Thêm" tile
    while fewer than 5 photos; hint "Chụp hoặc chọn từ thư viện. Chạm ảnh để xem lớn."
    "Thêm" opens camera / library as today (iOS action sheet; Android gallery).
13. Tap a photo → full-screen viewer (iOS `NoteImagePreviewViewController`, Android `FullScreenImagePreview`).
14. "Lưu ghi chú" (54pt, 14 radius, blue) pinned at the bottom; it sits above the keyboard while typing.
    iOS has a "Xong" bar on the keyboard.
15. Save sends exactly what it does today (iOS `updateNotes(text, keptNoteImageURLs, newNoteImageData)` with
    `notesPlan`; Android `vm.saveNotes(text, kept, bytes)`). Max 5 photos.
16. Cart v2 note row opens the editor with the cart note, photos hidden; save sets the cart note
    (trimmed, empty → none), as the alert did.

## Out of scope

- Old inbox, old `NoteViewController`, `PreviewViewController` (old detail and create preview).
- Any API change. Photos on the cart.

## Acceptance

- [x] Unit tests: day grouping incl. 16:59:59Z / 17:00:00Z, kind mapping, unread style, photo count / limit (both apps)
- [x] iOS build + POS ADBDTests; Android `:app:testDebugUnitTest :app:assembleDebug`
- [x] Strings vi + en on both apps
