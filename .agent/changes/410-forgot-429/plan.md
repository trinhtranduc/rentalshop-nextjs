# Plan — API: rate-limited auth calls answer 429 with the standard error body

Issue: #410 · Status: approved · Spec: ./spec.md

## Root cause

`createRateLimiter` in `packages/middleware/src/rate-limit/rate-limit.ts` builds its own 429 body
`{ error: 'Too many requests', message: 'Rate limit exceeded. Maximum N requests per S seconds.', retryAfter }`
instead of `ResponseBuilder.error(...)`. There is no `success` and no `code`. Routes return the
limiter's response as-is. In addition, `RATE_LIMIT_EXCEEDED` is missing from `ERROR_MESSAGES` in
`packages/utils/src/api/response-builder.ts`, so the one route that already used the code
(resend-verification) sent `message: "RATE_LIMIT_EXCEEDED"`.

## Routes that share the limiter

| Route | Limiter | Limit (unchanged) | Before |
|---|---|---|---|
| POST /api/auth/forgot-password | `passwordResetRateLimiter` | 3 / hour / IP | bare body |
| POST /api/auth/login | `authRateLimiter` | 10 / 15 min / IP | bare body |
| GET /api/products | `searchRateLimiter` | 100 / 30 s / IP+UA | bare body |
| GET /api/customers | `searchRateLimiter` | 100 / 30 s / IP+UA | bare body |
| POST /api/auth/resend-verification | `createRateLimiter` (per email) | 3 / 5 min / email | standard body, but `message` = the code |

`apiRateLimiter` is exported but unused. No other 429 in `apps/api`.

## Steps

1. Test first (`bug-fix-tdd`): `tests/api/rate-limit-standard-error.test.ts` runs the real
   forgot-password route (db and email mocked) and each pre-configured limiter until blocked, and
   checks `success: false`, `code: RATE_LIMIT_EXCEEDED`, readable `message`, `Retry-After`. Update
   the old assertion `body.error === 'Too many requests'` in
   `tests/packages/middleware/rate-limit.test.ts` to the new contract. Commit alone.
2. Fix: the limiter returns `{ ...ResponseBuilder.error('RATE_LIMIT_EXCEEDED'), retryAfter }` with the
   same status and headers. Add `RATE_LIMIT_EXCEEDED` to `ERROR_MESSAGES`. Resend-verification
   returns the limiter's response directly (its 2-argument `ResponseBuilder.error` call was ignored
   at runtime and a TS error).
3. i18n (`i18n-keys`): `RATE_LIMIT_EXCEEDED` in `locales/{ja,ko,zh}/errors.json` (en/vi and vi
   `errors-mobile.json` already have it; en/vi text made generic).
4. Mobile, minimal: iOS `Localizable.strings` (en, vi-VN) key `RATE_LIMIT_EXCEEDED`, and the
   `ErrorCodes.swift` fallback text made generic (it talked about verification emails). Android
   `ApiErrorMessages.stringId` maps `RATE_LIMIT_EXCEEDED` to `api_error_rate_limit_exceeded` in
   `values` and `values-vi`.
5. Verify: new tests, the whole `tests/` suite against the baseline,
   `npx tsc --noEmit -p apps/api/tsconfig.json` against `origin/dev`, iOS and Android builds/tests.

## Files

- `packages/middleware/src/rate-limit/rate-limit.ts` — standard body
- `packages/utils/src/api/response-builder.ts` — `RATE_LIMIT_EXCEEDED` message
- `apps/api/app/api/auth/resend-verification/route.ts` — reuse the limiter response
- `locales/{en,vi,ja,ko,zh}/errors.json`
- `apps/mobile/POS ADBD/Model/ErrorCodes.swift`, `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings`
- `apps/mobile-android/.../domain/error/ApiErrorMessages.kt`, `res/values{,-vi}/strings.xml`
- `tests/api/rate-limit-standard-error.test.ts` (new), `tests/packages/middleware/rate-limit.test.ts`

## API compatibility (installed apps)

Old apps = `origin/main-real`. Paths below are relative to `apps/mobile/POS ADBD/` (iOS) and
`apps/mobile-android/app/src/main/java/com/anyrent/pos/` (Android).

| Route / area | Change | Old iOS before → after | Old Android before → after | Web | Risk |
|---|---|---|---|---|---|
| POST /api/auth/forgot-password (429) | body gains `success:false`, `code:RATE_LIMIT_EXCEEDED`; `message`/`error` text change; `retryAfter`, status, headers kept | Before: `APIForgotPasswordResponse.success` is non-optional (`Library/Services/APIResponse.swift:397-402`), decode at `Library/Services/AuthenticationService.swift:465` throws, catch at :490-497 shows "Failed to parse server response" → vi "Không thể phân tích phản hồi từ máy chủ" (`vi-VN.lproj/Localizable.strings:326`). After: decodes, `success == false` → `createErrorFromResponse` (:478) → `APIErrorResponse.localizedMessage` (`Model/ErrorCodes.swift:1318-1323`) → `.rateLimitExceeded` (:25) `defaultMessage` (:509-518): no `RATE_LIMIT_EXCEEDED` key in the old strings, so the fallback (:607) localized → vi "Quá nhiều yêu cầu. Vui lòng đợi vài phút trước khi yêu cầu gửi lại email xác minh." (`vi-VN.lproj/Localizable.strings:328`), shown by `Viewcontrollers/Auth/ForgotPasswordViewController.swift:158`. Readable; wording mentions verification email. | Before: `execute` (`data/ApiClient.kt:916-923`) throws `AppError.Http(429, errorMessage())`; no `code`, so `errorMessage` (:959-982) picks `error` = "Too many requests"; `ApiErrorMessages.resolve` (`domain/error/ApiErrorMessages.kt:15-26`) returns it; shown under the field (`ui/auth/AuthScreens.kt:261`). After: `code` is not mapped in the old table (:28-45), so `detail` = `error` = "Too many requests. Please wait a few minutes and try again." (English). | `packages/utils` auth client: stale tab gets a richer body; nothing reads the old keys only | none (improvement on iOS) |
| POST /api/auth/login (429) | same | Before: `LoginResponse.success` non-optional (`Library/Services/APIResponse.swift:35-41`), decode at `AuthenticationService.swift:44` throws, catch :88-90 passes the raw `DecodingError` (Apple's "The data couldn't be read because it is missing."). After: same path as above → the localized rate-limit fallback text. | Before → after: same as forgot-password (`data/ApiClient.kt:63` → `execute`). "Too many requests" → the new English sentence. | same | none (improvement) |
| GET /api/products, GET /api/customers (429 after 100 req / 30 s) | same | Not verified per screen. Old `APIErrorResponse` decoding (`Model/ErrorCodes.swift:1298-1309`) needs `success`, so any screen that uses it can now read the code; screens that decode a page model fail either way. | Same `execute` path: "Too many requests" → the new English sentence. | same | none |
| POST /api/auth/resend-verification (429) | `message`/`error` were the literal code (or a Vietnamese text passed as an ignored 2nd arg) → readable text; code and status unchanged | `.rateLimitExceeded` already mapped; display unchanged (code wins over message, `ErrorCodes.swift:1319-1320`) | Before: `message` == code → `errorMessage` skips it (:978) → "Request failed". After: the English sentence. | web `CheckEmailVerification` shows its own text on 429 | none |

New builds (this branch): iOS shows the `RATE_LIMIT_EXCEEDED` string from `Localizable.strings`
(vi "Bạn thao tác quá nhiều lần. Vui lòng đợi vài phút rồi thử lại."); Android maps the code to
`api_error_rate_limit_exceeded` (vi text the same).

## Risks

- Any client that matched `body.error === 'Too many requests'` exactly: none found in the repo
  besides the unit test, which is updated.

## Rollback

Revert the fix commit. The 429 goes back to the bare body; the extra translations are harmless.
