# Cart note editor: tab bar and photos

Issue: #480 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05 · Follows #477, #478

## Problem

Owner test on a real iPhone (dev with #478 create-order sheet and #479 note editor v2):

1. Opening "Ghi chú" from the new cart and closing it brings the tab bar back on the cart. The editor was
   presented `.fullScreen`; on dismiss UIKit re-lays the pushed cart and the hidden tab bar shows again.
2. The cart note editor hides the photo block (#477 decision "text only"). The owner wants photos there too.

## Proposed outcome

- iOS editor presented `.overFullScreen` (the cart stays in place, as `V2.presentForm` documents), so the tab
  bar stays hidden. Android: the cart is a root route with no bottom bar; the editor is a dialog, nothing to fix.
- Cart note editor shows photos (max 5). Picked photos stay with the cart in memory
  (iOS `CartStore.noteImageData`, ~180KB JPEG each; Android `CartStore.noteImageFiles`, cache files), show again
  when the editor reopens, and the confirm sheet's create sends them as multipart `notesImages`
  (iOS `OrderService.createOrder(from:notesImages:idempotencyKey:)`; Android `CartOrderSubmit.create(key, noteImages)`
  → `ApiClient.createOrder(noteImages = …)`). They are cleared with the cart (successful create, reset, logout).

## Constraints

- No API change: `POST /api/orders` already accepts multipart `data` + `notesImages` (iOS old preview uses it).
- Without photos the create request is unchanged (iOS same multipart call with no files; Android same JSON body).
- Editing an existing order from the cart (edit mode) keeps the editor text only: those photos are managed on the
  order detail and the edit path (review screen) has its own note photos.

## Decision log

- 2026-10-05 — Owner wants photos in cart notes (reverses the #477 "text only" decision).
- 2026-10-05 — Photos are memory only: they do not survive an app restart (the draft cart on disk keeps text
  fields only). Accepted by the coordinator's brief ("in memory is fine").
- 2026-10-05 — #478 is already merged into `dev`, so the confirm sheet passes the photos directly; no separate
  follow-up is needed in #478 (agent).
