# Plan

Status: in-progress

Skills: implement-issue, mobile-parity, timezone-dates, i18n-keys, mobile-e2e-local, verify-change.

1. Failing tests. iOS `OrdersHomeTests` (filter default, query sortBy/sortOrder/dateField, sort bar text, rent row
   line + highlight, dd/mm/yy at the VN midnight boundary), `ProductsV2Tests` (cart cost lines, total cost, profit,
   staff hidden). Android `OrdersHomeTest`, `ProductRulesTest` the same. Commit.
2. iOS: `RentOrdersFilter` (sortDate + direction), sheet, sort bar, `OrderRowCell` rent context, `DayFormatter.dmy`
   in rows/detail/cart, `CartItem.costPrice`, `CartCostLogic`, cart UI; vi/en strings.
3. Android: same in `OrdersBoardLogic`, `OrdersHomeScreen`, `OrderRowDates`, detail, `CartV2Screen`; strings.
4. Verify: iOS build + tests, Android assemble + unit tests, simulator + emulator on a local seeded API
   (sort by each date, range by each date, row dates, cart cost as merchant, none as staff). Screenshots.
