# Plan: order sheet titles (#1395)

1. iOS: `V2.sheetTitle` and shared insets next to `V2FittingSheet`; use on all 8 titles; append strings.
2. Android: shared `OrderSheetTitle`; same sheets; append strings.
3. Tests: `HandOverCollateralTests` (mode to title), iOS and Android resource text; update the UI test that reads the old unpaid title.
4. Verify: xcodebuild, iOS tests, gradle, then each sheet on a visible Simulator and AVD against a local seeded API on Homebrew Postgres.
