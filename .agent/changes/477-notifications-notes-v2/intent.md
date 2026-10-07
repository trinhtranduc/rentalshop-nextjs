# Notifications and order note editor in the new design

Issue: #477 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

The notifications inbox (iOS `Viewcontrollers/Notifications/NotificationsViewController.swift`, Android
`ui/inbox/InboxScreen.kt`) and the order note editor (iOS `OrderNotesEditorViewController`, Android `NotesSheet`
of the new order detail) still use the old look. The cart v2 note entry is a one-line text alert.
The owner approved the boards "CHỐT · Thông báo" (TB-thong-bao) and "CHỐT · Ghi chú đơn (nội dung + ảnh)"
(GC-ghi-chu) on 2026-10-05.

## Proposed outcome

- With `newProducts` on, the inbox looks like TB-thong-bao: day groups on Vietnam civil days, type-coloured
  icon tiles, unread styling, "Tất cả" / "Chưa đọc · N" chips. Same API calls, paging and unread badge.
- The note editor of the new order detail looks like GC-ghi-chu (full screen, X + "Ghi chú #0057",
  "Nội dung", "Ảnh", 72pt tiles, dashed "Thêm", pinned "Lưu ghi chú"). Same payloads, max 5 photos.
- The cart v2 note row opens the same editor.

## Affected users and systems

All shop roles. iOS and Android. No API or data change.

## Constraints

- Flag off (`newProducts`) keeps the old inbox. The note editor is only reachable from new-UI screens
  (new order detail, cart v2), so it is restyled in place.
- Cart files are being changed by another agent (#473): only the code that opens the note editor changes there.
- No character limit exists for notes (API/Prisma `String?`, no zod max), so no counter is shown.
- PR #474 (shared `ImageViewerViewController`) is not merged into `dev`: iOS reuses the existing note preview
  (`NoteImagePreviewViewController`), Android `FullScreenImagePreview`.

## Open questions

- None blocking.

## Decision log

- 2026-10-05 — Flag: `newProducts` on both apps. The products home hosts the bell, Settings v2 has no entry
  (agent; brief "behind the existing new-UI flags").
- 2026-10-05 — Notification types today are only `ORDER_CREATED` and `ORDER_STATUS_CHANGED` (+ `data.status`).
  Mapping: created → order (blue); status PICKUPED → hand-over truck (blue); RETURNED → returned (purple);
  COMPLETED → payment (green, sale paid and taken); CANCELLED and unknown → neutral grey bell; any other
  status → order. Future types containing PAYMENT → payment, OVERDUE/LATE → late (red clock),
  HANDOVER/PICKUP_DUE → hand-over (agent, from the brief's type list).
- 2026-10-05 — "Chưa đọc" uses the existing `GET /api/notifications?isRead=false` (iOS service already sends it;
  Android gains an optional `isRead` parameter). N is the server `unreadCount`.
- 2026-10-05 — Cart note: text only. The cart keeps no photos (iOS `CartStore`, Android `CartStore` have notes
  only; photos are attached in the order preview/detail). The editor hides the photo block (agent).
- 2026-10-05 — Photo count label follows the board ("Ảnh" left, "2/5 ảnh" right) using the existing
  "%d/%d photos" string.
- 2026-10-05 — iOS new order detail sent note photos at JPEG 0.8 (often several MB); it now uses the same
  ~180KB compression as the old preview (#435). Same fields and endpoint.
- 2026-10-05 — Android "Thêm" opens the gallery only, as today; its hint says "Chọn ảnh từ thư viện…" instead
  of "Chụp hoặc chọn…" (agent).
- 2026-10-05 — Android "Xóa đã đọc" asks for confirmation in the new inbox, like iOS (mobile-parity: same
  destructive-action confirmations). The old Android inbox is unchanged (agent).
- 2026-10-05 — Out of scope: the old `PreviewViewController` (create preview reached from cart v2) still opens
  the old `NoteViewController`; it belongs to the create-order flow being changed in #473 (agent).
- 2026-10-05 — Superseded by #480: the owner wants photos in cart notes too (kept by the cart, sent on create),
  and the editor is presented `.overFullScreen` so the cart keeps its tab bar hidden.
