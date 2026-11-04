# Spec — `dateField=pickupDay`

1. `GET /api/orders?dateField=pickupDay&startDate&endDate` returns orders with
   `pickupPlanAt` in the range OR `pickedUpAt` in the range. Range = Vietnam civil days of the day keys
   (`getUtcRangeForDateKeys`), exact bounds, as for `pickupPlanAt`.
2. An order that matches both columns is one row (a row filter, not a join or a union): `total`, pages and sort are
   those of the same list without the date filter.
3. An order with neither column set (sale, draft) never matches. One bound alone is open-ended, as today.
4. The filter coexists with search (`q`) and the merchant filter: the date OR must not replace the search OR
   (`where.OR`) or the `AND` built for merchant + search.
5. `dateField=pickupPlanAt` and every other existing value behave exactly as before (same `where`).
6. `GET /api/orders/export?dateField=pickupDay` has the same meaning (same OR over the export period bounds);
   existing values unchanged.
7. `GET /api/calendar/orders/count` does not take `dateField`: no change.
8. Web: "Ngày giao" sends `dateField=pickupDay` for the list, the chip counts and the export; "Ngày tạo" is unchanged;
   the URL stays `pickup=<preset>`. The filter shows a tooltip "Ngày giao: dự kiến hoặc thực tế" (vi, en, ja, ko, zh).
9. Unknown `dateField` values are still rejected with 400 by `ordersQuerySchema`.
