# Plan — #740

1. `locales/{en,vi}/errors.json`: 119 codes appended.
2. `packages/utils/src/core/error-display.ts`: `lookupErrorTranslation`, `looksLikeErrorCode`.
3. `packages/hooks/src/hooks/useApiError.ts`, `useSubscriptionError.ts` use them.
4. `tests/error-codes-translated.test.ts`.
5. Verify: `cd tests && yarn jest error-codes-translated`; the web UI e2e raw-key detector (#727) on the screens of #737 and #738.
