# Plan — #952

Issue: #952 · Spec: ./spec.md

1. Tests first (commit): iOS `CartUI952Tests` (date row states, pencil rule, cart customer after save, Home has no bar);
   Android `CartUi952Test` (same); web model test (lines per add) and admin form test (0đ kept).
2. iOS: `CartV2ViewController.datesRow` (icon), `CustomersV2ListViewController` + `CustomerV2Cell` (pencil),
   `EditCustomerViewController` compact sheet mode, `ProductsHomeViewController` (bar removed),
   `ProductFormViewController` (no `KeyboardDoneBar`), strings; UI tests use the top-right cart button.
3. Android: `CartV2Screen` date row, `CustomersV2Screens` pencil + `EditCustomerV2Screen` compact sheet,
   `ProductsHomeScreen` bar removed, strings.
4. Web: `apps/client/app/orders/create/*` lines per add; `apps/admin` product form 0đ.
5. Verify: iOS build + unit tests, Android `assembleDebug testDebugUnitTest`, jest, tsc/lint/build client + admin,
   visible Simulator / emulator / headed Chrome checks with screenshots.

Skills: `mobile-parity`, `verify-change`, `mobile-e2e-local`.
