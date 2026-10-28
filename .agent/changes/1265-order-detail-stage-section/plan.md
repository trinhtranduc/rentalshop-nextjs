# Plan 1265

1. iOS: `OrderDetailViewController.moneyRows` tách dòng trên / section / dòng dưới; `stageSection` thêm hai dải. `DepositPlanViews` bớt padding (12/12).
2. Android: `StageSection` trong `OrderDetailV2Screen.kt` (hai dải full width), `InstallmentCard` padding 12dp.
3. Kiểm: iOS unit `DepositPlan*`, `OrderDetail*`; Android `testDebugUnitTest`, `compileDebugKotlin`; ảnh trước/sau vi/en trên Simulator và AVD.
