# Plan — #721

1. `packages/utils/src/core/revenue-calculator.ts`: `collateralByEvent`, `revenueEventKey`; #503 refund rule.
2. `apps/api/app/api/analytics/income/orders/route.ts`: `collateral` on event rows.
3. `packages/utils/src/analytics/period-report.ts`: series collateral from events.
4. Web: `overview-model.ts` related collateral, `DetailDrawer.tsx` −0.
5. iOS: `APIResponse.swift` `DailyIncomeOrder.collateral`, `OverviewDashLogic.swift`.
6. Verify:
   - `scripts/e2e/business-e2e.sh --build` (both zones).
   - `cd tests && npx jest web-overview revenue-calculator`.
   - Web e2e for 4 periods.
   - iOS `test7lOverviewSheets` and the checker.
