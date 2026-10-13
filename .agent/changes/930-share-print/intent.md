# Intent — #930 share image without status and amount due; Print on order detail

Owner, 2026-10-13. Mockups: artifact 9b56KwErJWiGpiyFEfyEY4, tabs "Ảnh chia sẻ đơn" (#share) and "Chi tiết đơn: nút In" (#odprint).

- **What:** the order share image a shop sends to a customer should not depend on the order status (no status pill,
  no "Còn phải trả", no amount in the QR) and should carry the created date and each item's note. On the order
  detail, the secondary bottom button is always "In"; "Sửa đơn" / "Gia hạn" move into the ⋯ sheet; the sheet has no icons.
- **Why:** the image is forwarded and kept; status-dependent figures go stale and confuse customers. Shops print
  often; Edit / Extend are rarer.
- **Constraints:** iOS is the reference, Android matches. No API change (uses `createdAt` and `orderItems[].notes`,
  both already decoded). Draft image from the cart stays as it is.
