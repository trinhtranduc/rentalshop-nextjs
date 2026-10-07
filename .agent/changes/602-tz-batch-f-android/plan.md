# Plan — #602 timezone batch F (Android)

1. Failing tests first, committed alone: new `domain/ShopTimeZoneTest.kt` (4 phone zones),
   `domain/VietnamPhoneSameRequestsTest.kt`; `CartPlanDatesTest` / `OrderPlanDaysTest` expectations move from the
   device zone to the shop zone (+ Tokyo/LA rows); `DefaultAvailabilityRepositoryBatchTest` gets a 4-zone window case.
2. `FIX_MODE=1`. Add `ShopTime`; point the existing `shopZone` constants at it.
3. `OrderPlanDays`, `RentalExtension`, `OrderExtendSheet`, `CartStore` (defaults, today).
4. `OrdersBoardLogic`, `OrdersHomeLogic` / view model, `OverviewLinks`, detail late/schedule (`OrderDetailLogic.rentalDays`).
5. Calendar / overview / today-work paths; view-model today defaults; availability today.
6. Formatters (`UiHelpers`, `ReceiptDates`, `CustomerRules`), LocalDate labels through `formatDayShort(LocalDate)`.
7. `./gradlew :app:testDebugUnitTest :app:assembleDebug`, compare with `origin/dev` (370 tests, 0 failures);
   PR "Android counterpart of #601".
