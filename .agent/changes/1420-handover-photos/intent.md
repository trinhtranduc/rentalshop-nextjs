# Photos at hand-over and return (web)

Issue: #1420 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

The merchant web shows `pickupNotesImages` and `returnNotesImages` in the notes card, but nothing on the web can add them. Evidence of the goods' condition must work on web as on the phones.

## Proposed outcome

The hand-over and return dialogs have a photo block (layout A): "Chọn ảnh", maximum 3. The status changes first, then the photos go in a separate `ordersApi.updateOrder(id, {}, files)`.

## Affected users and systems

`apps/client` and `locales`. No change under `apps/api`, `prisma` or API packages (`packages/utils` is only called).

## Constraints (owner's final decisions)

- Optional; confirm always active. Maximum 3 at hand-over and 3 at return; 3/3 hides the add tile. API limit stays 5. `MAX_NOTE_IMAGES` stays 5.
- Uploaded photos cannot be deleted. Before confirming, × removes a chosen photo.
- Compression: reuse `detail/settings.tsx` (0.18 MB, 1920 px).
- Photos stay in memory only; closing the tab loses them, the order is not affected. Reopen and press "Thêm ảnh".

## Decision log

- A failed status call now keeps the dialog open so the chosen photos are not lost (today it closes). A thrown 5xx or network error reaches no global toast, so this path shows one toast itself.
- `useGlobalErrorHandler`: a 4xx of the upload would toast and also show the inline line. While the upload runs, a capture listener on `api-error` stops the toast, except subscription errors. 5xx and network errors throw without an event, so they were never double.
- Web "Thêm ảnh" also shows at 0 photos while PICKUPED: the tab's answer to "closed the tab" needs it. The notes card is already a place for this; phones keep no new section at 0 photos.
