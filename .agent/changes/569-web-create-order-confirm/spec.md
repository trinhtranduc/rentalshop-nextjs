# Spec — #569

Pressing "Tạo đơn" (create mode, nothing missing, not blocked) opens the confirm dialog. Nothing is sent
until its confirm button is pressed.

| Part | Rent | Sale | iOS |
|---|---|---|---|
| Title | Tạo đơn thuê? | Bán & thu tiền? | `products.cart.confirm.rentTitle` / `saleTitle` |
| Khách | customer name (else phone, else —) | same | `confirm.customer` |
| Lịch thuê | `T5 08/10 → T6 16/10 · 9 ngày` | — | `confirm.dates` (web adds the weekday, as elsewhere on web) |
| Món | one row per item: `name × qty` (`× n ngày` for per-day lines) and the line total | same | `confirm.items` (iOS joins the names in one line; web lists them with line totals) |
| Giảm giá | when > 0 | same | web only (shown in the cart) |
| Trừ điểm thưởng | when > 0 | same | web only (create-only loyalty) |
| **Tổng đơn** | `totalAmount` | same | `products.cart.total` |
| Trùng lịch | orange block with the conflict lines when the shop allows overlaps | — | `cart.overlap.title` |
| Blue box | **Thu cọc ngay** `depositAmount` | **Thu ngay** total − loyalty | `collectDeposit` / `collectSale`, `CartV2Logic.collectNow` |
| Buttons | Huỷ · Tạo đơn (Vẫn tạo đơn with conflicts) | Huỷ · Bán & thu tiền | `Cancel`, `products.cart.create` / `sellAndCollect` / `cart.overlap.createAnyway` |

Every amount is read from `buildPayload(...)` (the body sent) or `computeTotals(...)` (loyalty, sale due).
Enter confirms (the confirm button has focus); Esc and the backdrop cancel unless the create is running.
While it runs the confirm button is disabled; on success the dialog closes and the receipt opens as today;
on an API error the dialog stays for a retry; on `ORDER_SCHEDULE_CONFLICT` it closes and the cart shows
the blocked state as today.

Overlap OFF with conflicts: the button stays disabled (unchanged). Sửa đơn: unchanged (overlap warning
dialog only, "Vẫn lưu thay đổi").
