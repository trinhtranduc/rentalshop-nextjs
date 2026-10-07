# Spec — #602 timezone batch F (Android)

See #578 `spec.md` §F (F1–F4) and the parity notes of PR #601. For Android:

1. `domain/ShopTime.kt`: `ShopTime.zone` (computed, Vietnam), `zoneId`, `timeZoneParam()` (URL-encoded),
   `today(now)`. The other `shopZone` constants (`OrderRowDates`, `RentedOutLogic`, `OverlapWarnings`,
   `ChangeHistory`, `NotificationsLogic`, `OrderDetailLogic`) read it.
2. AND-1/2/3: `OrderPlanDays` and `RentalExtension` default to the shop zone, so cart `isoPickup/isoReturn`, edit
   load (`parseOrderDate`), the extension sheet and the availability window (batch + single) are
   `[D-1T17:00:00.000Z, DT16:59:59.000Z]`. Android pickers already return the tapped `LocalDate` (UTC millis), so
   no phone-zone bridging is needed. The availability window keeps today's instant format (not `date=` keys).
3. AND-4: rent list Today / 7 days / month keys are shop days; wire stays `YYYY-MM-DD` keys.
4. AND-5: `OrdersHomeLogic.lateDays/orderRows/saleSections`, `OverviewLinks.latePage` default to the shop zone, so
   "late" agrees with `RentedOutLogic.isLate`.
5. AND-6: calendar month/day, overview period and outlet-operations paths (`CalendarLogic.monthCountPath/dayPath`,
   `OverviewLogic.periodPath/outletOperationsPath`) send `timeZone=Asia%2FHo_Chi_Minh`; today keys are shop days.
   `deviceTimeZoneId()` is removed.
6. AND-7: order detail schedule row and day count (`OrderDetailLogic.rentalDays`) in shop days.
7. AND-8: `formatDayShort`/`dayKey`/`formatDisplayDate` default to the shop zone, plus a `formatDayShort(LocalDate)`
   overload for picked days; receipts (`ReceiptDates`) and customer order dates in shop days.
8. AND-9: the cart default day and the availability screen start on the shop today.

Acceptance: JUnit cases with the default zone Tokyo, Los Angeles, UTC and Vietnam at 16:59:59Z / 17:00:00Z and
month/year ends give the strings a Vietnam phone sends today; `VietnamPhoneSameRequestsTest` compares against
the old formulas under Vietnam.
