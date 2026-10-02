---
name: i18n-keys
description: Use when adding or changing any user-facing string, translation key or API error code in the web apps (next-intl, locales/*), or when a new ResponseBuilder code is introduced. Keeps all 5 locales, the error-code files and the mobile error tables in sync.
---

# Translation keys and error codes

Web apps use next-intl with `defaultLocale = 'vi'`. Locale files live in `locales/{en,vi,zh,ko,ja}/<namespace>.json`
and are imported explicitly in `apps/client/i18n.ts` and `apps/admin/i18n.ts`.

1. **Pick the namespace** (`common`, `orders`, `products`, `errors`, …). Add the key to **all five** locale
   files with the same key path. Vietnamese is the source text; write a real English translation and
   reasonable `zh`, `ko`, `ja` ones. Never leave the Vietnamese string in another locale.
2. **New namespace file?** Import it in both `apps/client/i18n.ts` and `apps/admin/i18n.ts`; the loader is
   explicit, not glob-based.
3. **API error/success codes** (`ResponseBuilder.error('CODE')`) must exist in `locales/*/errors.json`.
   Codes the POS apps can receive also go into `locales/*/errors-mobile.json`.
4. **Check key parity** before finishing. `yarn audit:error-translations` points to a missing script, so use:
   ```bash
   for f in locales/en/*.json; do n=$(basename "$f"); for l in vi zh ko ja; do
     diff <(jq -r 'paths(scalars)|join(".")' "$f" | sort) <(jq -r 'paths(scalars)|join(".")' "locales/$l/$n" | sort) \
       >/dev/null || echo "MISMATCH $l/$n"; done; done
   ```
   Expected output: nothing.
5. **Mobile error tables:** iOS reads codes from `apps/mobile/POS ADBD/Model/ErrorCodes.swift` and
   `en.lproj` / `vi-VN.lproj/Localizable.strings` (regenerate with `apps/mobile/scripts/update_error_codes.py`).
   Android maps codes in `apps/mobile-android/app/src/main/java/com/anyrent/pos/data/ApiClient.kt` with strings
   in `res/values/strings.xml` and `res/values-vi/strings.xml`. Add new codes on both when the apps can hit them.
6. **Never hardcode** user-facing text in components; use `useTranslations('<ns>')`. Dates and money go
   through the formatters in `@rentalshop/utils` (dates: see `timezone-dates`).
