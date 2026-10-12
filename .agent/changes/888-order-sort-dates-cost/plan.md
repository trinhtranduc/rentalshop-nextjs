# Plan

Status: done

Skills: implement-issue, mobile-parity, timezone-dates, i18n-keys, mobile-e2e-local, verify-change.

1. Failing tests. iOS `OrdersHomeTests` (filter default, query sortBy/sortOrder/dateField, sort bar text, rent row
   line + highlight, dd/mm/yy at the VN midnight boundary), `ProductsV2Tests` (cart cost lines, total cost, profit,
   staff hidden). Android `OrdersHomeTest`, `ProductRulesTest` the same. Commit.
2. iOS: `RentOrdersFilter` (sortDate + direction), sheet, sort bar, `OrderRowCell` rent context, `DayFormatter.dmy`
   in rows/detail/cart, `CartItem.costPrice`, `CartCostLogic`, cart UI; vi/en strings.
3. Android: same in `OrdersBoardLogic`, `OrdersHomeScreen`, `OrderRowDates`, detail, `CartV2Screen`; strings.
4. Verify: iOS build + tests, Android assemble + unit tests, simulator + emulator on a local seeded API
   (sort by each date, range by each date, row dates, cart cost as merchant, none as staff). Screenshots.

## Decision log

- "Gần nhất trước" = latest date first (`desc`), "Xa nhất trước" = `asc`: the meaning "Ngày giao gần nhất" already
  had, and ascending over every order would put the oldest orders first. The mockup's sample (all near today) reads
  ascending; flagged for the owner in the PR.
- dd/mm/yy applies to every order row line (orders tab, calendar day list, overview drill-downs, which share the
  row) and to the order detail and cart dates. Section bands ("HÔM NAY · T2 12/10") keep their weekday.
- "Lấy" replaces "Giao" in the date texts of the list, detail and cart (row "Lấy …", detail steps "Lấy / Đã lấy",
  "lấy sau N ngày", "Hẹn lấy …", product calendar "Lấy … · trả …"; the hand-over sheet's confirm shares the
  "Đã lấy" key and reads "Đã lấy · thu N"). The main action button "Giao đồ", "Sẵn sàng giao" and the
  "Việc cần làm" tags ("Cần giao") are unchanged — left for the owner.
- Android: the cart draft did not save `costPrice`; fixed so a relaunch keeps Giá vốn (iOS `CartItem` is Codable).
