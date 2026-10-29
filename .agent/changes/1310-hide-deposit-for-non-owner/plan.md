# Plan

1. Commit test thất bại (iOS `CalendarOverviewSettingsV2Tests`, Android `SettingsRowsTest`).
2. iOS: `ShopDepositLogic` + `sections`.
3. Android: `DepositSetting` + `SettingsRows.sections`.
4. Verify: xcodebuild build + test, gradle assembleDebug + testDebugUnitTest.
5. Hàng trong `.agent/api-changes/LOG.md`: không đổi API, nên không thêm hàng (kiểm lại với pr-governance).
