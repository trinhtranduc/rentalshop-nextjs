# Plan — #1545

Status: in-progress

1. Test trước (commit riêng, phải fail):
   - `tests/web-signup-prefs.test.ts`: `signupShopPrefs`; RegisterForm không còn ô ngôn ngữ / tiền tệ, có hint, không ghi NEXT_LOCALE;
     `register.countryHint` có ở 5 locale; ShopAuthPage hiện LanguageSwitcher trên điện thoại.
   - iOS `AuthFormsTests`, Android `SignupCountryTest` / `RegisterBodyTest` / resource test: request theo ngôn ngữ app + quốc gia.
2. `packages/constants/src/shop-language.ts`: `signupShopPrefs`, bỏ `signupDefaults`.
3. `packages/ui/src/components/forms/RegisterForm.tsx`: bỏ 2 ô, thêm hint, payload từ `signupShopPrefs(locale, countryCode)`, bỏ `applyShopLanguageOnWeb` và reload.
   `packages/ui/src/components/forms/auth-shop.tsx`: LanguageSwitcher ở mọi bề rộng.
   `locales/*/auth.json`: thêm `register.countryHint`, bỏ `register.language`, `register.currency`, `register.languageCurrencyHint` (không còn dùng).
4. iOS: `Model/AuthForms.swift`, `RegisterStoreV2ViewController.swift`, `Localizable.strings` (en, vi), UI test `test0cSignupCountry`.
5. Android: `domain/auth/AuthForms.kt`, `SignupCountries.kt`, `ApiParity.kt`, `AuthV2Screens.kt`, strings vi/en.
6. Kiểm tra (skill `verify-change`, `i18n-keys`, `mobile-parity`):
   - `yarn --cwd tests test web-signup-prefs register-signup-prefs locales` (TZ=UTC và Asia/Ho_Chi_Minh)
   - `npx tsc --noEmit -p apps/client/tsconfig.json` so với dev
   - web e2e có cửa sổ (Chrome) trên API local `:3192`: trang vi + Việt Nam, trang en + Việt Nam, trang vi + Hoa Kỳ → DB `language` / `currency`
   - iOS: unit `POS ADBDTests`, UI test `test0cSignupCountry` trên Simulator có cửa sổ
   - Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`, e2e tay trên emulator có cửa sổ
