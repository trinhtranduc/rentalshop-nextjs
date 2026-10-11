# Intent — #708 tile details and "Xem các đơn liên quan" match the tile

Owner (2026-10-09): "khi bấm vào stats cần có giải thích giá trị đó là gì. khi bấm view đơn hàng liên quan cần đảm bảo đơn có liên quan tới giá trị".

- Each Overview tile's detail says in one sentence what the number is.
- "Xem các đơn liên quan" lists the orders behind the number; each row shows the money it adds; the list total = the tile.
- Thực thu = money held (`revenue.cashCollected`, collateral included, #710), with a "Thế chân nhận − trả" step.
- Web and iOS now; Android follows iOS in its own PR. No API change (rows come from GET /api/analytics/income/orders).
