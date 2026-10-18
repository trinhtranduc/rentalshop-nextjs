# Plan — #1067 discount cap

Skills: `bug-fix-tdd`, `mobile-parity`, `i18n-keys`, `verify-change`.

1. Failing tests, committed alone (`test(mobile): reproduce discount above order total`):
   - iOS `POS ADBDTests/ProductsV2Tests.swift`: `CartV2Logic.discountExceeds`, `discountError`, `cartDiscountError`,
     `NumberPadEntry` fresh entry.
   - Android `CartMoneyRowsTest.kt`: `CartV2Logic.discountExceeds`, `discountLimit`; `NumericPadEntryTest`
     (ui/common) for `NumericPadEntry.press`.
   - Web `tests/web-create-order-model.test.ts`: `discountExceeds` from `apps/client/app/orders/create/create-model.ts`.
2. iOS: `CartV2Logic` (Model/ProductsV2.swift) rule + text; `NumberPickerViewController` error label, disabled
   Confirm, `NumberPadEntry`; `CartV2ViewController` passes the subtotal, adds a discount notice next to
   `blockedNotice`, blocks the CTA. Strings in `en.lproj` / `vi-VN.lproj`.
3. Android: `CartV2Logic` (domain/products/ProductRules.kt); `AppNumericPadSheet` `errorText` / `confirmEnabled`
   + `NumericPadEntry`; `CartV2Screen` notice + disabled CTA. Strings in `values` / `values-vi`.
4. Web: `discountExceeds` in create-model; `OrderEditor` red text + disabled submit; en/vi `orders.json`.
5. Follow-up issue: API guard for discount > subtotal with an api-compat analysis.
6. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `assembleDebug testDebugUnitTest`, `tests` jest file +
   `locales-valid-json`, client lint/tsc vs origin/dev, iOS simulator run on an own Postgres with screenshots.
