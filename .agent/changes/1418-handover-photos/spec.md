# Spec #1418

1. Hand-over sheet shows title row "Ảnh tình trạng đồ", "Không bắt buộc", count `n/3`; buttons "Chụp ảnh đồ" ("Chụp thêm" when n>0) and "Thư viện"; tiles with ×.
2. At 3/3 the buttons are hidden. × brings them back.
3. Confirm is enabled with 0 photos. With 0 photos the requests are the same as today.
4. iOS hand-over sheet opens at large detent; focusing a field keeps it and the buttons above the keyboard, on a small phone too.
5. Confirm: status JSON `PUT /api/orders/{id}` first; then multipart `PUT` with `data={}` and `pickupNotesImages` parts.
6. Status call fails (no network or 4xx): order unchanged, error shown, chosen photos are kept when the sheet opens again.
7. Photo upload fails: order stays handed over; detail shows the faded photos and "Chưa tải được N ảnh…" with "Thử lại".
8. Queue survives relaunch; opening the order retries it.
9. Before every send the order is read again; growth of at least the pending count clears the queue with no resend. Otherwise send at most `3 - server count`; no room clears the queue.
10. Queue is per user + shop + order: another user or shop on the device never sees or sends it; logout does not send it. The same user sees it again after login.
11. Detail shows section "ẢNH KHI GIAO · N" under the status block when N>0, tap opens large; "Thêm" while PICKUPED, N<3, nothing pending, and the user has `orders.update`. No delete anywhere.
12. iOS keeps `UpdateOrderRequest` free of these fields. Android parses `pickupNotesImages` additively: missing, null, null elements and non-array values all give an empty or filtered list.
13. Camera denied: message with a way to Settings; library and confirm still work.

Out of scope: return sheet, web, API.
