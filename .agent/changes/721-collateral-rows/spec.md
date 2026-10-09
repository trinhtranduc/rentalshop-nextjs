# Spec — #721

1. `income/orders` `status=all` rows carry `collateral`: that row's events' collateral part, from the same events as `collateralFlow`. Σ over the period = received − returned.
2. `series[].cashCollected` takes collateral from the same events, so Σ days = `revenue.cashCollected`.
3. #503: hand-over and cancel on the same shop day refund only a deposit taken on an earlier day. When the order was booked that day too, there is no event and the day nets to 0.
4. The web and iOS Thế chân related lists use the `all` rows' `collateral`. Rows with 0 are not listed.
5. The web drawer never shows "+-0".
6. Tests:
   - BF-STAT-02/04 on row collateral.
   - BF-CASH-04.
   - BF-CANC-03 is now a plain test.
   - BF-OUT-02 pages through orders.
   - Unit tests in `tests/revenue-calculator.test.js`, `tests/web-overview-model.test.ts` and `OverviewDashLogicTests.swift`.
   - The web e2e covers today, 7 days, this month and last month.
