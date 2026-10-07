# Plan — #623 (web only, one PR into dev)

1. `apps/client/app/lib/print-settings.ts` (or next to settings): types, defaults, `readPrintSettings/writePrintSettings` (try/catch), `labelPageSize(settings)`; tests in `tests/web-print-settings.test.ts`.
2. `apps/client/app/products/labels/code128.ts` + `tests/web-code128.test.ts` (vectors: "ABC-123", "12345678", "Hello", checksum values computed by hand / known references).
3. `products/labels/page.tsx` + `labels-model.ts` (selection, copies, missing list) + `LabelSheet.tsx` (preview + print CSS, same pattern as `orders/receipt/ReceiptDialog.tsx` print isolation).
4. Settings: tab `printer` in `apps/client/app/settings/settings-model.ts`, section in `sections.tsx` / `SettingsPanel.tsx`.
5. Receipt: `ReceiptSlip.tsx` / `ReceiptDialog.tsx` read `billWidth`.
6. Entry buttons on products list and product detail.
7. Locales `locales/{en,vi}` (files that exist for these namespaces).
8. Verify: `cd tests && TZ=UTC npx jest web-code128 web-print-settings` (+ Asia/Ho_Chi_Minh), `tsc -p apps/client` (0 new errors), `next lint` on touched files, browser check on local stack (:3290 against API :3280) with screenshots: settings tab, labels page, print preview (emulate print media), bill at 58 mm.
