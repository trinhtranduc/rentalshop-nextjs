# Plan — Mobile auth screens match the approved boards (phase 5)

Issue: #386 · Status: accepted · Spec: ./spec.md

## Steps

1. Pure logic + tests:
   - iOS `Model/AuthForms.swift`: `AuthValidation` (login, store step, owner step, forgot), `BusinessTagRules`,
     `RegisterDraft` → `RegisterRequest`, `AuthErrorPlacement`, `ResendCooldown`; tests in `POS ADBDTests/AuthFormsTests.swift`.
   - Android `domain/auth/AuthForms.kt`: the same, plus the register JSON body; tests in `AuthFormsTest.kt`.
2. iOS `Viewcontrollers/Auth/v2/`: `AuthV2Components.swift` (field, primary button, header with progress),
   `LoginV2ViewController`, `RegisterStoreV2ViewController` (both steps), `ForgotPasswordV2ViewController`,
   `EmailSentV2ViewController`. `AppDelegate.loadLogin` picks the root by `FeatureFlags.shared.isOn(.newAuth)`.
3. Android `ui/auth/v2/AuthV2Screens.kt`: login, create store, forgot, email sent. `AnyRentNavHost`: the `login`,
   `forgot` and `register` routes render the v2 screens when `newAuth` is on; a new `email-sent` route.
   `ApiParity.registerMerchant` is reused unchanged.
4. Strings: iOS `vi-VN` + `en` `Localizable.strings`, Android `values` + `values-vi` `strings.xml`.
5. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `:app:testDebugUnitTest :app:assembleDebug`, manual run on
   both apps against a local API with `MOBILE_FEATURES=newAuth` and without it.

## Files

- iOS: `Application/AppDelegate.swift`, `Model/AuthForms.swift`, `Viewcontrollers/Auth/v2/*`, `Localizable.strings` (vi, en),
  `POS ADBDTests/AuthFormsTests.swift`, `project.pbxproj`
- Android: `domain/auth/AuthForms.kt`, `ui/auth/v2/AuthV2Screens.kt`, `ui/navigation/AnyRentNavHost.kt`,
  `strings.xml` (values, values-vi), `AuthFormsTest.kt`

## Risks

- A login bug locks everyone out: the success path calls the same functions as the old screen, the flag ships off,
  and can be switched off server-side (takes effect on the next launch).
- Fresh install: no cached config at first launch on iOS → old login once. Acceptable.

## Rollback

Turn `newAuth` off in `MOBILE_FEATURES`; revert the PR if needed.
