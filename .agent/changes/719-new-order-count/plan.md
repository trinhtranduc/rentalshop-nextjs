# Plan — #719

1. Web: `overview-model.ts` (`Tile.count`), `overview/sections.tsx`, `locales/{en,vi}/dashboard.json` (`home.tiles.newOrders`).
2. iOS: `OverviewDashLogic.swift` (`OverviewTile.count`), `OverviewDashViews.swift`, Localizable.strings (vi, en).
3. Android: `OverviewLogic.kt` (`orderValueOrders`), `OverviewV2Screen.kt`, strings (vi, en).
4. Tests: `tests/web-overview-tiles.test.ts`, `OverviewDashLogicTests.swift`, `OverviewLogicTest.kt`, web e2e and iOS checker.
