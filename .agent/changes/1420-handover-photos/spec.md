# Spec #1420

1. Hand-over dialog: block "Ảnh tình trạng đồ (n/3)", "Không bắt buộc", button "Chọn ảnh" at 0; tiles with × and an add tile from 1; at 3/3 the add tile hides.
2. Return dialog: "Ảnh lúc giao (n)" links that open a new tab, then the block "Ảnh lúc trả (n/3)". No block change to the money.
3. Confirm is active with 0 photos; with 0 photos the calls are the same as today.
4. Status call first (`pickupOrder`, `returnOrder`); dialog closes; then `updateOrder(id, {}, files)`.
5. Status call fails: order unchanged, one message, dialog stays open with the photos.
6. Upload runs: faded photos and "Đang tải ảnh…" in the notes card, group "Khi giao đồ" / "Khi trả đồ".
7. Upload fails: "Chưa tải được N ảnh. Đơn không bị ảnh hưởng." with "Thử lại"; exactly one message, no extra toast.
8. Retry reads the order first; growth of at least the pending count clears it with no resend.
9. Notes card: "Thêm ảnh" tile in the pickup group while PICKUPED, under 3 photos, nothing waiting. No delete control on pickup or return photos.
10. Eight keys in en, vi, ja, ko, zh under `orders.web.detail.dialog.photos`.
