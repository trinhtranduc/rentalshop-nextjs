# Spec — Mobile phase 7 gaps

Issue: #388 · Status: accepted · Intent: ./intent.md

## Behavior

### Product detail (`newProducts`, board SP-chi-tiet)
1. Under the price tiles, 7 cells for today and the next 6 device-zone days: day of month and free units from
   `GET /api/products/{id}/availability-calendar?from=&to=` (outlet users pass their outlet; a merchant gets the
   default outlet). Colour: 0 red, 1 orange, ≥2 green; today outlined. Caption "Số còn trống mỗi ngày · cửa hàng
   có N bộ" (N = `stock`). If the call fails, the old "đang thuê · còn · tổng" line shows instead.
2. Header "Đơn của sản phẩm" with "Tất cả N ›" (N = `total` of the unfiltered list) that opens every order of
   the product (iOS `OverviewRankingOrdersViewController(.product)`, Android `analytics-orders/product/{id}`).
3. Chips with counts: Sắp tới = RESERVED (sorted by pickup ascending), Đang thuê = PICKUPED (return ascending),
   Đã xong = RETURNED + COMPLETED (two calls, merged newest first). Cancelled orders are in no chip.
   Default chip Sắp tới; switching chips needs no new request.
4. Row: customer, "dd/MM → dd/MM · × qty · #number" (qty = this product's quantity in the order; sale: created
   day), and on the right: Sắp tới "Giao hôm nay" (blue) / "Giao dd/MM"; Đang thuê "Trễ N ngày" (red),
   "Trả hôm nay" (blue) / "Trả dd/MM"; Đã xong the status pill. iOS rows have no coloured left bar.

### Overview (`newOverview`, board Tong-quan)
5. Rows get a chevron and open: Đơn mới → orders created in the period (income orders `new`, the same bucket as
   the figure); Đang cho thuê → PICKUPED orders; Trễ hạn → PICKUPED rent orders whose return day is before
   today (sorted by return ascending; paging stops at the first not-late row); a top product → orders of that
   product created in the period. Thế chấp đang giữ opens the Đang cho thuê list (the orders holding it).

### Settings (`newSettings`, board Cai-dat)
6. Khách hàng shows `data.total` of `GET /api/customers?limit=1`; Người dùng shows `pagination.total` of
   `GET /api/users?limit=1`. Only for rows the role sees; a failed call shows no value.

### Fixes
7. English "1 day late" / "N days late" (iOS code-based plural over two keys, Android `plurals`), also for the
   other "N days late" texts; Vietnamese unchanged.
8. iOS `AppConfigService.fetch` sends `cachePolicy = .reloadIgnoringLocalCacheData`.
9. Android `CartStore`: deposit = Σ product deposit × quantity, recomputed on add / quantity / remove, unless the
   user set it (`setDeposit`) or it came from an order being edited; `clear()` resets that. Saved with the draft.
10. Remove Android `orders_collect`, `orders_refund`, `orders_not_prepared`, `orders_take_back` (unused).

## Out of scope

API changes, Android left bar on product order rows (the issue names iOS only), web.

## Acceptance

- [ ] Unit tests: strip days and tones, chip → statuses / merge, row state, late filter, plural key, deposit.
- [ ] iOS `POS ADBDTests` and Android `:app:testDebugUnitTest :app:assembleDebug` green.
- [ ] Screenshots of each changed screen on both apps next to its board, merchant and staff.
