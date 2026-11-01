# Photos at hand-over (phones): block, display, upload queue

Issue: #1418 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

A shop has no evidence of the goods' condition at hand-over, so damage disputes at return are hard to settle. `Order.pickupNotesImages` exists on the API but no app writes it.

## Proposed outcome

The "Giao đồ cho khách" sheet on iOS and Android has an always-visible photo block (layout A). The status change goes first and the photos follow in a separate call, so a photo failure can never block a hand-over. Photos wait on the device until they are uploaded.

## Affected users and systems

iOS and Android apps; roles MERCHANT, OUTLET_ADMIN, OUTLET_STAFF, OUTLET_INVENTORY. No change under `apps/api`, `prisma` or API packages.

## Constraints (owner's final decisions)

- Optional. The confirm button is always active.
- Maximum 3 at hand-over. 3/3 hides the add control. The API limit stays 5; do not change it.
- Uploaded photos cannot be deleted. Before confirming, × removes a chosen photo.
- Compression: reuse the note rule (about 180 KB, 1920 px). Do not change it.
- Not in scope: return sheet (#1419), web (#1420), money rules, stage button, sheet titles, first-run guide, onboarding.

## Decision log

- Skip rule on resend: the owner's note says "skip if the count grew". A multipart PUT is all or nothing, so a lost reply shows as growth of at least the pending count. Growth smaller than that came from another device; the photos are still sent, up to the 3 limit, so evidence is not silently dropped.
- Logout: the queue stays on disk under the user + shop folder and is invisible to anyone else; the same login resumes it. A kicked session is not the user's choice, so deleting there would lose evidence. Queues older than 30 days are removed.
- Android camera: in-app CameraX dialog, same library as `ImageSearchScreen.kt`, so Android has the same "Chụp ảnh đồ" as iOS.
- After the hand-over, the detail screen shows the photos only when the order has photos (zero photos means no new section, "shop không dùng: không có gì đổi" in the tab). Decided: such an order has no add control on phone.
- A failed upload is told once, in a small line under the status ("Chưa tải được N ảnh · Thử lại"), because the photos are often below the first screen. There is no second line under the photos, so there is one way to retry.
- Owner, after the first PR version: the photos sit inside "Giấy tờ & thế chân", not under the status. An order without that section shows the photos alone under "Ảnh khi giao · N", with no word about collateral. With collateral and no photos: as before.
