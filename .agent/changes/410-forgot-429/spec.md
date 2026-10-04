# Spec — API: rate-limited auth calls answer 429 with the standard error body

Issue: #410 · Status: approved · Intent: ./intent.md

## Behavior

1. When a `createRateLimiter` limiter blocks a request, the response status is 429.
2. The body has `success: false`, `code: "RATE_LIMIT_EXCEEDED"`, and a non-empty `message`
   that is not the bare code. `error` carries the same text (standard `ResponseBuilder.error`).
3. The body keeps `retryAfter` (seconds) as before.
4. The response has a `Retry-After` header (seconds, > 0) and keeps `X-RateLimit-Limit`,
   `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
5. `POST /api/auth/forgot-password` returns that body on the 4th call within an hour from one IP.
6. `passwordResetRateLimiter`, `authRateLimiter` (login) and `searchRateLimiter` (GET products,
   GET customers) all return the same shape. Their limits do not change (3/h, 10/15 min, 100/30 s).
7. `POST /api/auth/resend-verification` keeps returning 429 + `RATE_LIMIT_EXCEEDED` with
   `Retry-After`; its message is now readable text instead of the code.
8. `RATE_LIMIT_EXCEEDED` has text in `locales/{en,vi,ja,ko,zh}/errors.json`, iOS
   `Localizable.strings` (en, vi-VN), and Android `ApiErrorMessages` + `values`/`values-vi`.

## Out of scope

- Moving the in-memory store to Redis, or changing any limit.
- Other 429 sources (none found in `apps/api` besides the limiter and resend-verification).

## API and data

Error body on 429 changes from `{ error, message, retryAfter }` to
`{ success: false, code, message, error, retryAfter }`. All old keys stay; `error` and `message`
change text. No auth or scope change.

## Acceptance

- [x] Each behavior line has a test (`tests/api/rate-limit-standard-error.test.ts`,
      `tests/packages/middleware/rate-limit.test.ts`)
- [x] iOS and Android called out (plan: compatibility table)
- [x] New user-facing strings listed for all five locales
- [x] Cancelled orders, Vietnam civil days, role limits: not applicable
