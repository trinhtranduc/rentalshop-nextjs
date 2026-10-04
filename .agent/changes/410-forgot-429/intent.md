# API: rate-limited auth calls answer 429 with the standard error body

Issue: #410 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

After 3 forgot-password calls per hour from one IP, `POST /api/auth/forgot-password` answers 429
with `{ error, message, retryAfter }` and no `success` or `code`. The iOS app decodes every auth
response into a struct with a non-optional `success`, so the decode fails and the user sees
"Không thể phân tích phản hồi từ máy chủ" instead of "too many requests". Android shows the raw
English `error` string. Found in #386 (part of #385).

The 429 comes from `createRateLimiter` in `packages/middleware/src/rate-limit/rate-limit.ts`, which
is shared by login, product search and customer search too. They all send the same bare body.

## Proposed outcome

Every 429 produced by `createRateLimiter` is a `ResponseBuilder.error('RATE_LIMIT_EXCEEDED')` body:
`success: false`, `code: "RATE_LIMIT_EXCEEDED"`, a readable `message`, and a `Retry-After` header.
The code maps to readable text in `errors.json` (en, vi, ja, ko, zh), on iOS and on Android.

## Affected users and systems

All roles on the login and forgot-password screens (iOS, Android, web); heavy search users
(products, customers). Apps: `api`, iOS, Android. No data model change.

## Constraints

- Status stays 429. Limits (window, max) do not change.
- Additive: keep `retryAfter` in the body and the `X-RateLimit-*` headers.
- Installed iOS/Android builds from `main-real` must show something readable (see plan).

## Open questions

- The limiter store is in memory per API instance. Out of scope here.

## Decision log

- 2026-10-04 — reuse the existing `RATE_LIMIT_EXCEEDED` code (already sent by resend-verification and
  known to iOS `ErrorCodes.swift`) instead of adding `TOO_MANY_REQUESTS`. (agent, per issue)
