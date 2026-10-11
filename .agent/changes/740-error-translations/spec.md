# Spec — #740

1. Every code the API can return (ResponseBuilder.error, `code:`, ErrorCode.X) has a sentence in `locales/en/errors.json` and `locales/vi/errors.json`; the two files have the same codes.
2. `lookupErrorTranslation(t, code)` returns the sentence or null; it uses `t.has`, and for a translator without it rejects the code and `<namespace>.<code>`.
3. `translateError`, `translateSuccess` and `useSubscriptionError` show the localized generic message (`UNKNOWN_ERROR` / `errors.generic`) when a code has no translation, and log the code. They never show a code, `errors.<CODE>` or the API's English sentence for a code.
4. `tests/error-codes-translated.test.ts` fails when a new API code has no en/vi sentence.
5. ja, ko, zh `errors.json` hold 27 of 366 codes before this change and are not touched.
