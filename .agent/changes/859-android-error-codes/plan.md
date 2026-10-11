# Plan (Android)

1. Failing unit tests: `ApiErrorMessagesTest` (codes, fill, fallback, session-end reason), `AuthFormsTest`
   (login code), `ProductRulesTest` (staff cannot create), resource test (exact vi/en texts). Commit.
2. Code: `ApiErrorMessages` (codes, `fillParams`, `sessionEndStringId`), `ApiClient.errorMessage` passes
   `data.messageParams`, `AnyRentNavHost` uses the session-end reason, `AuthErrorMapping`, `ProductAccess.canCreate`.
   Strings appended to both locales.
3. `./gradlew :app:assembleDebug :app:testDebugUnitTest`; emulator check against a local seeded API
   (staff Home without "+", merchant with it, one error sentence). No API change, no LOG row.
