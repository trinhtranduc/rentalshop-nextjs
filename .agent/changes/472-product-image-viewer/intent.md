# Full-screen product image viewer (mobile, v2 product screens)

Issue: #472 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

On the new product screens (flag `newProducts`) staff cannot see a product photo full size. The detail
pager crops the photos and the list thumbnail is 68 pt. Owner (2026-10-05): "ở chi tiết sản phẩm bấm hình
sẽ ra full hình, hoặc ở danh sách sản phẩm bấm avatar cũng ra full hình".

## Proposed outcome

- Product detail v2: a tap on the photo opens a full-screen viewer at that photo, with paging, pinch zoom,
  an X button, and swipe-down (iOS) or back (Android) to close.
- Home v2 product list: a tap on the thumbnail opens the same viewer. The rest of the row still opens
  detail, + still adds to cart. A product without a photo keeps today's row behaviour.
- The thumbnail reads "Xem ảnh <tên>" to VoiceOver / TalkBack.

## Affected users and systems

All roles that see the product screens. iOS (reference) and Android. No API or data change.

## Constraints

- Reuse the existing viewers (Android `FullScreenImagePreview`, iOS note image preview) instead of a new library.
- Old screens keep their current viewers unchanged.
- Do not touch notification files (parallel work).

## Open questions

- None.

## Decision log

- 2026-10-05 — Behaviour as in the owner's message and the canvas note "Ảnh sản phẩm" (owner).
