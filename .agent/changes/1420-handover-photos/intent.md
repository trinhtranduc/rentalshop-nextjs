# Hand-over photos on the web

Issue: #1420 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

The merchant web shows `pickupNotesImages` in the notes card, but nothing on the web can add them. Evidence of the goods' condition must work on web as on the phones.

## Proposed outcome

The hand-over dialog has a photo block (layout A): "Chọn ảnh", maximum 3. The status changes first, then the photos go in a separate PUT. The order page has its own card "Ảnh khi giao". The return dialog only shows those photos.

## Affected users and systems

`apps/client` and `locales`. No change under `apps/api`, `prisma` or API packages.

## Constraints (owner's final decisions)

- Optional; confirm always active. Maximum 3; 3/3 hides the add tile. API limit stays 5.
- Uploaded photos cannot be deleted. Before confirming, × removes a chosen photo.
- No capture at return. Return dialog is read only; no `returnNotesImages` upload.
- Only `pickupNotesImages` move to the card. Pickup note text and old return and damage notes stay in the notes card.
- Card hidden at 0 photos unless photos are on their way in this tab. Add tile only while PICKUPED with 1 or 2 photos, as on the phones.
- Compression: reuse `detail/settings.tsx` (0.18 MB, 1920 px).
- Photos stay in memory only; closing the tab loses them, the order is not affected.

## Decision log

- The upload uses `authenticatedFetch`, not `ordersApi.updateOrder`: `parseApiResponse` raises the global toast on a 4xx, and the warning already says it failed. A capture listener was tried and does not work: Chrome fires a window target's listeners in registration order.
- A failed status call keeps the dialog open so the chosen photos are not lost. A thrown 5xx or network error reaches no global toast, so this path shows one itself.
- Chrome repeats a request by itself when a reused connection drops before the reply, so a lost reply there can store photos twice. JavaScript cannot turn this off; fixing it needs an idempotency key on the API, out of scope here.
