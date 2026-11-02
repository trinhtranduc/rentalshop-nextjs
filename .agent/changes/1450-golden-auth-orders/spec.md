# Spec #1450

1. `tests/api-compat/golden/auth-orders-main-real.json` holds the answers of `origin/main-real` for the scenarios in `auth-orders-scenarios.ts`, through the real `withPermissions`, `authenticateRequest` and `validateMerchantAccess`.
2. `auth-orders-api-compat.test.ts`: every scenario equals the golden except those it names, and each named one asserts the new answer:
   - Prisma failure during authentication: 503 `SERVICE_UNAVAILABLE`, no raw text.
   - Another exception that mentions "subscription": 403 `SUBSCRIPTION_ERROR`, catalog sentence.
   - Manager bank writes: 403 `INSUFFICIENT_PERMISSIONS`.
3. Green under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`. The golden file is the same when generated in either zone.
4. `LOG.md` has a row for the `UPLOAD_IMAGE_FAILED` code.
