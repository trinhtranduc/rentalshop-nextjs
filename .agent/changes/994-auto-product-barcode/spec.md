# Spec — Auto-generate a product barcode

Issue: #994 · Status: in-progress · Intent: ./intent.md

## Behavior

1. A new product form on iOS and Android starts with an 11-digit barcode: the last 8 digits of the current time in milliseconds, then 3 random digits `000`–`999`. Example: clock `1759000123456` and random `42` produce `00123456042`.
2. The same form shows a regenerate control. Tapping it replaces the field with a new code from rule 1. The user can still type or scan a different code.
3. Editing a product leaves the saved barcode in the field. Regenerate is still available if the user wants a new code.
4. The web create form (`/products/add`) fills a code with `generateBarcode` and shows a refresh icon (the words "Tạo mã" stay as the button name for screen readers and the hover tip). It uses the same 11-digit rule.
5. Saving still sends `barcode` on the existing create/update request. No new field.

## Out of scope

- The old phone form behind `newProducts = false` (it already fills 6 random digits).
- Generating a code on the server when the client omits `barcode`.
- Changing uniqueness rules. A collision still fails at the API; the user taps regenerate and saves again.

## API and data

No request or response change. `barcode` stays an optional string. External ids stay numeric `publicId`.

## Acceptance

- [x] `ProductBarcode.generate(1759000123456, 42)` is `00123456042` on iOS and Android
- [x] The iOS create form's barcode field is 11 digits after load, and the regenerate button is present
- [x] Web `generateBarcode` test in `tests/web-products-form.test.ts` still passes
- [x] New strings: iOS `en` + `vi-VN`, Android `values` + `values-vi`
