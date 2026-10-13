# Plan #938
1. Failing tests (jest + iOS + Android unit), commit `test(...)`.
2. API: `packages/database/src/outlet-operations.ts` held list behind `withCollateralHeld`; route flag; LOG row.
3. Web: `overview-model.ts` chip + held rows/total; `dashboard/related/page.tsx` loads held when kind=collateral;
   `analyticsApi.getOutletOperations` option; locales (5).
4. iOS: `CalendarV2Logic.rows(late:)`, `CalendarV2ViewController.loadDay` late request; `OverviewDashLogic` chip +
   held rows; `OverviewRelatedOrdersViewController` loads held; strings.
5. Android: same in `CalendarLogic`, `CalendarV2ViewModel`, `OverviewDashLogic`, `OverviewRelatedScreen`; strings.
6. Verify: jest (UTC + VN), lint, type-check, xcodebuild test, gradle test, business e2e both TZ, screenshots.
7. PR into dev (Vietnamese body, `Fixes #938`, compat table).
