# Plan — #633 (one PR into dev)

Issue: #633 · Status: accepted · Spec: ./spec.md

1. iOS logic: `OverviewDashLogic.topAllLimit = 50`; `topProductRows` / `topCustomerRows` take a `limit` (default
   `topLimit`). `TabsV2APIService.overviewReport(_:limit:)` + `overviewReportParameters(_:limit:)`. Tests first in
   `POS ADBDTests/OverviewDashLogicTests.swift`.
2. iOS UI: `OverviewV2ViewController.topCard` title row gets "Xem tất cả"; new `OverviewTopAllViewController`
   (Viewcontrollers/Chart) loads the report with `limit: 50`, renders `OverviewTopRowView` rows, pushes
   `OverviewRankingOrdersViewController` on tap. Strings vi/en.
3. Android: same in the new overview screen (`ui/overview`), pure helper + unit test, `analytics/overview` with
   `limit=50` for the full list. Strings en/vi.
4. Verify: iOS build + unit tests, Android assemble + unit tests, screenshots.

API compatibility: none ("No API change" in the PR).
