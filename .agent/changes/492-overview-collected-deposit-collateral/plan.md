# Plan — #492
1. `revenue-calculator.ts`: add `CollectedBreakdown`, `emptyCollectedBreakdown`, `addToCollectedBreakdown`.
2. `income-period-summary.ts`: fill `collectedBreakdown`.
3. `period-report.ts`: expose it on `revenue`.
4. Tests in `tests/collected-breakdown.test.js`, run under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
5. iOS: OverviewV2.swift decoding, OverviewV2ViewController hero/tiles/sheet, strings, XCTest.
6. Android: OverviewLogic parsing, OverviewV2Screen, strings, JUnit.
7. Canvas boards updated (done, version 73).
8. PR into `dev` with "Fixes #492" and an API compatibility table.
