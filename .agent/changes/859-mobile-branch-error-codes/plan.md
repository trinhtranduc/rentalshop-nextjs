# Plan (iOS)
1. Failing tests in `POS ADBDTests/Phase8Tests.swift` (decode each code, sentence = localized text, exact vi/en texts,
   names filled, fallback without names) and `AuthSessionTests` (`OUTLET_DEACTIVATED` → own sign-out reason).
2. `Model/ErrorCodes.swift`: cases, defaults, statuses, `messageParams`, placeholder fill. `AuthSession.swift`: reason.
   `ProductService.deleteProduct`: decode the error body with `APIErrorResponse`. Strings appended to both locales.
3. Build + `POS ADBDTests` on a simulator. LOG row not needed (no API change); Android follows in its own PR.
