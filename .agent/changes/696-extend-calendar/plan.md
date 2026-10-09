# Plan (#696)

1. iOS `DatePickerViewController`: `.extend` mode, `isEmbedded`, `configureForExtension`, `onExtendDayChange`.
2. iOS `OrderExtendSheetViewController`: embed it in place of `UIDatePicker`; keep `newDay` in the shop zone.
3. Android `AppDateRangePickerSheet.kt`: extract `AppRangeCalendar`; `OrderExtendSheet` uses it with the pickup pinned.
4. Verify: iOS UI test `test5bOrderExtendEditPrint` (taps a later day), Android unit tests, manual run on emulator; the saved `returnPlanAt` checked in the local DB.
