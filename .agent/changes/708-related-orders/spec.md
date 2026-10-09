# Spec — #708

1. Detail of every tile (web drawer, iOS sheet) starts with the rule sentence for that tile.
2. Thực thu tile = `revenue.cashCollected` (falls back to `collected` on an API without it); its rows add up to it, the last step being "Thế chân nhận − trả" = received − returned.
3. Related list, period of the tile, every page loaded:
   - Giá trị đơn mới: orders created in the period (status `new`), cancelled shown with 0; total = `totalOrderValue`.
   - Thực thu: money events (status `all`), each row its `revenue`; total = `cashCollected`.
   - Còn phải thu: orders created in the period still owing (web list; iOS keeps the not-picked-up list); total = `outstanding`.
   - Thế chân: + securityDeposit of pickups, − of returns; total = received − returned.
4. "Đơn mới · N đơn" = rent + sale orders of `orderValueByType` (#716).
5. E2E: `tests/e2e/web/dashboard-stats.web.js` and `tests/e2e/mobile/overview-sheets-check.js` check tile = API = detail headline, rows = API, rows sum, related total = tile.
