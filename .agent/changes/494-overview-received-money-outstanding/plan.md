# Plan — #494
1. `revenue-calculator.ts`: `CollateralFlow`, `emptyCollateralFlow`, `addToCollateralFlow`.
2. `income-period-summary.ts`: fill `collateralFlow`; `period-report.ts`: expose it.
3. `order-value.ts`: `outstandingBreakdown` with a `todayStart` cut-off; select `pickupPlanAt`.
4. `packages/database/src/outlet-operations.ts`: `cash.collateralToCollect`.
5. Tests under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
6. iOS and Android sheets, strings, unit tests.
7. PR into `dev`, "Fixes #494", API compatibility table.
