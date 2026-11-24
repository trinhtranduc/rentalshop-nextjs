# Plan — Bill: phí trễ, phụ thu khi nhận trả

Issue: #1633 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS (reference): `BillReturnRule` (pure, next to `ShareMoneyRule` in `Model/OrderShareImage.swift`); new share
   source fields (`status` exists; add `lateFee`, `damageFee`, `cancelKept`, `collected`); new `Money` cases drawn by
   `Utils/OrderShareRenderer.swift`; `Model/Order.swift` `toPrintData` block after TOTAL; keys in all 12 `.lproj`
   (append safely, check `wc -l`); tests in `POS ADBDTests/OrderShareImageTests.swift`.
2. Android, matching iOS: `BillReturnRule` in `domain/orders/OrderShareModel.kt`; renderer
   `ui/orders/OrderShareRenderer.kt`; `print/ThermalPrinter.kt`; strings in every `values-*`; JUnit tests.
3. Web: `receipt-model.ts` gets `returnBlock` and drops the `damageFee` row; `ReceiptSlip.tsx` draws it; keys in the 12
   `locales/*/orders.json` (`web.receipt`); `tests/web-receipt-model.test.ts`.
4. Skills: `mobile-parity` (both apps), `i18n-keys`, `verify-change`. No API change, so no `api-compat-review` row.

## Files

- `apps/mobile/POS ADBD/Model/OrderShareImage.swift`, `Utils/OrderShareRenderer.swift`, `Model/Order.swift`, `*.lproj/Localizable.strings`, `POS ADBDTests/OrderShareImageTests.swift`
- `apps/mobile-android/.../domain/orders/OrderShareModel.kt`, `ui/orders/OrderShareRenderer.kt`, `ui/orders/OrderReceiptShare.kt`, `print/ThermalPrinter.kt`, `res/values*/strings.xml`, tests
- `apps/client/app/orders/receipt/receipt-model.ts`, `ReceiptSlip.tsx`, `locales/*/orders.json`, `tests/web-receipt-model.test.ts`

## Verify

- iOS: `xcodebuild … -scheme Development build`, then the `OrderShareImageTests` unit tests.
- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`.
- Web: `yarn --cwd tests test web-receipt-model locales-valid-json`, `npx tsc --noEmit -p apps/client/tsconfig.json`, lint of the changed files.

## Risks

- Old store builds keep printing the old bill; nothing breaks.
- A bill printed before the return still has no block: the shop prints or shares again after Nhận trả.

## Rollback

Revert the PR; no data or API change.
