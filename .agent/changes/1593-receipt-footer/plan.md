# Plan — Bill footer says the bill was made with AnyRent

Issue: #1593 · Status: in-progress · Spec: ./spec.md

## Steps

1. Test `tests/receipt-footer.test.ts`: spec items 1–4 read from the source and locale files.
2. Web: `ReceiptSlip.tsx` `t('generatedBy')`; rename the key in `locales/*/orders.json` (12 files) (`i18n-keys`).
3. iOS: `Order.swift` uses the existing key; `vi-VN.lproj/Localizable.strings` text.
4. Android: `ThermalPrinter.kt` resolves `receipt_generated_by` through `planText`; `values-vi/strings.xml` text.

## Verify

- `yarn --cwd tests test receipt-footer locales-valid-json locales-complete hardcoded-vietnamese`
- `npx tsc --noEmit -p apps/client/tsconfig.json` (no new error), `yarn --cwd apps/client lint`
- iOS `xcodebuild … build`; Android `./gradlew :app:testDebugUnitTest --tests '*ThermalPrinter*'` and `:app:assembleDebug`

## Rollback

Revert the PR (text only).
