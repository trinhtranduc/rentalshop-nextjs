# Plan — #708

1. Web: `apps/client/app/dashboard/overview-model.ts` (related model, collateral step), `DetailDrawer.tsx`, `page.tsx`, new `dashboard/related/page.tsx`, `locales/{en,vi}/dashboard.json` (dashboard is en/vi only).
2. iOS: `OverviewDashLogic.swift`, `OverviewV2.swift`, `OverviewDashViews.swift`, `OverviewV2ViewController.swift`, `RentedOutOrdersViewController.swift` (OverviewRelatedOrdersViewController), Localizable.strings (vi, en).
3. Tests: `tests/web-overview-model.test.ts`, the web e2e and the iOS UI test `test7lOverviewSheets` + checker.
4. Verify: `npx tsc --noEmit -p apps/client/tsconfig.json`, `cd tests && npx jest web-overview`, web e2e, `ios-e2e.sh --only test7lOverviewSheets` then the checker.
