# Spec #1420

1. Hand-over dialog: block "Ảnh tình trạng đồ (n/3)", "Không bắt buộc", button "Chọn ảnh" at 0; tiles with × and an add tile from 1; at 3/3 the add tile hides.
2. Return dialog: "Ảnh lúc giao (n)" links that open a new tab, read only. No block at 0 photos: as today.
3. Confirm is active with 0 photos; with 0 photos the calls are the same as today.
4. Status call first (`pickupOrder`); dialog closes; then a multipart PUT with `data={}` and `pickupNotesImages`.
5. Status call fails: order unchanged, one message, dialog stays open with the photos.
6. Card "Ảnh khi giao" between the items card and the notes card, with faded photos and "Đang tải ảnh…" during the upload.
7. Upload fails: one warning above the first card, "Chưa tải được N ảnh · Thử lại"; a click retries; no toast.
8. Retry reads the order first; growth of at least the pending count clears it with no resend.
9. Notes card has no pickup photos. Pickup text, return and damage text and photos stay.
10. No delete control in the card. Eight keys in en, vi, ja, ko, zh under `orders.web.detail.dialog.photos`.
